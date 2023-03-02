using System;
using System.Linq;
using DevExpress.ExpressApp;
using DevExpress.Data.Filtering;
using DevExpress.Persistent.Base;
using DevExpress.ExpressApp.Updating;
using DevExpress.ExpressApp.Security;
using DevExpress.ExpressApp.SystemModule;
using DevExpress.ExpressApp.Security.Strategy;
using DevExpress.Xpo;
using DevExpress.ExpressApp.Xpo;
using DevExpress.Persistent.BaseImpl;
using DevExpress.Persistent.BaseImpl.PermissionPolicy;
using TF.Module.BusinessObjects;
using System.Collections.Generic;
using System.Reflection;
using ExcelDataReader;
using static TF.Module.BusinessObjects.Mechanism;
using static TF.Module.BusinessObjects.Metric;

namespace TF.Module.DatabaseUpdate {
    // For more typical usage scenarios, be sure to check out https://docs.devexpress.com/eXpressAppFramework/DevExpress.ExpressApp.Updating.ModuleUpdater
    public class Updater : ModuleUpdater {
        public Updater(IObjectSpace objectSpace, Version currentDBVersion) :
            base(objectSpace, currentDBVersion) {
        }
        public override void UpdateDatabaseAfterUpdateSchema() {
            base.UpdateDatabaseAfterUpdateSchema();

            // create roles
            Dictionary<string, PermissionPolicyRole> role2policy = new Dictionary<string, PermissionPolicyRole>();
            string[] role_names = { "Administrators", "Assessors", "Externals" };
            foreach(var role_name in role_names)
            {
                role2policy[role_name] = ObjectSpace.FirstOrDefault<PermissionPolicyRole>(r => r.Name == role_name);
                if (role2policy[role_name] == null)
                {
                    role2policy[role_name] = ObjectSpace.CreateObject<PermissionPolicyRole>();
                    role2policy[role_name].Name = role_name;
                }
                role2policy[role_name].IsAdministrative = false;

                switch(role_name)
                {
                    case "Administrators":
                        role2policy[role_name].IsAdministrative = true;
                        break;
                    case "Assessors":
                        role2policy[role_name].PermissionPolicy = SecurityPermissionPolicy.ReadOnlyAllByDefault;
                        role2policy[role_name].AddNavigationPermission("Application/NavigationItems/Items/Default/Items/PermissionPolicyRole_ListView", SecurityPermissionState.Deny);
                        role2policy[role_name].AddNavigationPermission("Application/NavigationItems/Items/Default/Items/ApplicationUser_ListView", SecurityPermissionState.Deny);
                        role2policy[role_name].AddNavigationPermission("Application/NavigationItems/Items/Reports", SecurityPermissionState.Deny);
                        role2policy[role_name].AddTypePermission(typeof(ApplicationUser), SecurityOperations.ReadWriteAccess, SecurityPermissionState.Allow)
                            .AddMemberPermission(SecurityOperations.ReadWriteAccess, "Roles; ChangePasswordOnFirstLogon; IsActive", "", SecurityPermissionState.Deny);
                        role2policy[role_name].AddTypePermission(typeof(Assessment), SecurityOperations.CRUDAccess, SecurityPermissionState.Allow);
                        role2policy[role_name].AddTypePermission(typeof(Pillar), SecurityOperations.ReadWriteAccess, SecurityPermissionState.Allow);
                        role2policy[role_name].AddTypePermission(typeof(Mechanism), SecurityOperations.ReadWriteAccess, SecurityPermissionState.Allow);
                        role2policy[role_name].AddTypePermission(typeof(Metric), SecurityOperations.ReadWriteAccess, SecurityPermissionState.Allow);
                        break;
                    case "Externals":
                        role2policy[role_name].PermissionPolicy = SecurityPermissionPolicy.ReadOnlyAllByDefault;
                        role2policy[role_name].AddNavigationPermission("Application/NavigationItems/Items/Default/Items/PermissionPolicyRole_ListView", SecurityPermissionState.Deny);
                        role2policy[role_name].AddNavigationPermission("Application/NavigationItems/Items/Default/Items/ApplicationUser_ListView", SecurityPermissionState.Deny);
                        role2policy[role_name].AddNavigationPermission("Application/NavigationItems/Items/Reports", SecurityPermissionState.Deny);
                        role2policy[role_name].AddTypePermission(typeof(ApplicationUser), SecurityOperations.ReadWriteAccess, SecurityPermissionState.Allow)
                            .AddMemberPermission(SecurityOperations.ReadWriteAccess, "Roles; ChangePasswordOnFirstLogon; IsActive", "", SecurityPermissionState.Deny);
                        role2policy[role_name].AddActionPermission("e9e637f5-d7e7-43b2-bb1a-2fd9c23ae08b"); // new version
                        role2policy[role_name].AddActionPermission("70193d13-ba28-4c40-a2b6-f205ea25071e"); // compare
                        role2policy[role_name].AddTypePermission(typeof(Assessment), SecurityOperations.Read, SecurityPermissionState.Deny);
                        role2policy[role_name].AddObjectPermission(typeof(Assessment), SecurityOperations.Read,
                            "[Status] = ##Enum#TF.Module.BusinessObjects.Assessment+EAssessmentStatus,Public#", SecurityPermissionState.Allow);
                        break;
                    default:
                        break;
                }
            }
            // persists roles
            ObjectSpace.CommitChanges();

            // create an admin user
            ApplicationUser userAdmin = ObjectSpace.FirstOrDefault<ApplicationUser>(u => u.UserName == "Admin");
            if (userAdmin == null)
            {
                userAdmin = ObjectSpace.CreateObject<ApplicationUser>();
                userAdmin.UserName = "Admin";
                // save user to get key id
                ObjectSpace.CommitChanges();
                ((ISecurityUserWithLoginInfo)userAdmin).CreateUserLoginInfo(SecurityDefaults.PasswordAuthentication, ObjectSpace.GetKeyValueAsString(userAdmin));
                // give administrators role
                userAdmin.Roles.Add(role2policy["Administrators"]);
                ObjectSpace.CommitChanges();
            }

            // add master assessment if not available
            Assessment assessment = ObjectSpace.FirstOrDefault<Assessment>(a => a.Code == "MASTER");
            
            // standards
            var standards = new List<string>();

            // now open embedded excel file
            var assembly = Assembly.GetExecutingAssembly();
            var resourceName = "TF.Module.DatabaseUpdate.TF.xlsx";
            using (var stream = assembly.GetManifestResourceStream(resourceName))
            {
                using (var reader = ExcelReaderFactory.CreateReader(stream))
                {
                    var result = reader.AsDataSet();

                    // version
                    DateTime version = DateTime.Parse(Convert.ToString(result.Tables["Main"].Rows[0][1]));
                    if(assessment != null && assessment.CreatedOn <= version)
                    {
                        // older master assessment, rebuild it
                        assessment.Delete();
                        ObjectSpace.CommitChanges();
                        assessment = null;
                    }

                    // create master assessment if needed
                    if (assessment == null)
                    {
                        assessment = ObjectSpace.CreateObject<Assessment>();
                        assessment.Code = "MASTER";
                        assessment.Name = "Master Assessment";
                        assessment.CreatedOn = version;

                        // add mechanisms
                        var mechanismTable = result.Tables["Mechanisms"];
                        for (int i = 1; i < mechanismTable.Rows.Count; i++)
                        {
                            var row = mechanismTable.Rows[i];

                            // create mechanism
                            Mechanism mechanism = ObjectSpace.CreateObject<Mechanism>();

                            string pillar_code = row[0].ToString();
                            Pillar pillar = assessment.Pillars.SingleOrDefault(p => p.Code == pillar_code);
                            if (pillar == null)
                            {
                                pillar = ObjectSpace.CreateObject<Pillar>();
                                pillar.Code = pillar_code;
                                pillar.Name = pillar_code;
                                pillar.Assessment = assessment;
                                assessment.Pillars.Add(pillar);
                            }

                            mechanism.Code = row[1].ToString();
                            mechanism.Name = row[2].ToString();
                            mechanism.Description = row[3].ToString();
                            mechanism.DesignWeight = int.Parse(row[4].ToString());
                            string designQuestion = row[5].ToString();
                            if (string.IsNullOrWhiteSpace(designQuestion))
                                designQuestion = "Which of the following sentences best matches the design of your system?";
                            mechanism.DesignQuestion = designQuestion;
                            mechanism.OperationalWeight = int.Parse(row[6].ToString());
                            string operationalQuestion = row[7].ToString();
                            if (string.IsNullOrWhiteSpace(operationalQuestion))
                                operationalQuestion = "Which of the following sentences best matches the operational efficacy of your system?";
                            mechanism.OperationalQuestion = operationalQuestion;

                            mechanism.Pillar = pillar;
                            pillar.Mechanisms.Add(mechanism);

                            for (var j = 0; j < 5; j++)
                            {
                                string choice_text = row[8 + j].ToString();
                                if (string.IsNullOrWhiteSpace(choice_text))
                                    break;
                                var mechanism_choice = ObjectSpace.CreateObject<MechanismChoice>();
                                mechanism_choice.Row = j + 1;
                                mechanism_choice.Name = choice_text;
                                mechanism_choice.Phase = EMetricPhase.Design;
                                mechanism_choice.Mechanism = mechanism;
                                mechanism.Choices.Add(mechanism_choice);
                            }

                            for (var j = 0; j < 5; j++)
                            {
                                string choice_text = row[13 + j].ToString();
                                if (string.IsNullOrWhiteSpace(choice_text))
                                    break;
                                var mechanism_choice = ObjectSpace.CreateObject<MechanismChoice>();
                                mechanism_choice.Row = j + 1;
                                mechanism_choice.Name = choice_text;
                                mechanism_choice.Phase = EMetricPhase.Operational;
                                mechanism_choice.Mechanism = mechanism;
                                mechanism.Choices.Add(mechanism_choice);
                            }
                        }

                        // add metrics
                        var metricTable = result.Tables["Metrics"];
                        for (int i = 1; i < metricTable.Rows.Count; i++)
                        {
                            var row = metricTable.Rows[i];

                            // create metric
                            Metric metric = ObjectSpace.CreateObject<Metric>();
                            string mechanism_code = row[0].ToString();
                            Mechanism m = assessment.Pillars.SelectMany(p => p.Mechanisms).SingleOrDefault(x => x.Code == mechanism_code);
                            metric.Mechanism = m;
                            m.Metrics.Add(metric);

                            metric.Code = row[2].ToString();
                            metric.Phase = (EMetricPhase)Enum.Parse(typeof(EMetricPhase), row[1].ToString());
                            metric.MetricType = (EMetricType)Enum.Parse(typeof(EMetricType), row[3].ToString());
                            metric.Name = row[4].ToString();
                            metric.Description = row[5].ToString();
                            metric.Standards = row[6].ToString();
                            metric.Weight = int.Parse(row[7].ToString());

                            if (!string.IsNullOrWhiteSpace(metric.Standards))
                            {
                                foreach(var s in metric.Standards.Split(','))
                                {
                                    var standard_name = s.Trim();
                                    var standard = assessment.Standards.SingleOrDefault(st => st.Name == standard_name);
                                    if(standard == null)
                                    {
                                        standard = ObjectSpace.CreateObject<Standard>();
                                        standard.Name = standard_name;
                                        assessment.Standards.Add(standard);
                                    }
                                    var metric_standard = ObjectSpace.CreateObject<MetricStandard>();
                                    metric_standard.Metric = metric;
                                    metric_standard.Standard = standard;
                                    standard.MetricStandards.Add(metric_standard);
                                    metric.MetricStandards.Add(metric_standard);
                                }
                            }

                            for (var j = 0; j < 5; j++)
                            {
                                string rule_text = row[8 + j].ToString();
                                if (string.IsNullOrWhiteSpace(rule_text))
                                    break;

                                int rule_value = int.Parse(rule_text);
                                var mechanism_choice = m.Choices.Single(c => c.Row == j + 1 && c.Phase == metric.Phase);
                                var rule = ObjectSpace.CreateObject<MetricRule>();
                                rule.Choice = mechanism_choice;
                                mechanism_choice.MetricRules.Add(rule);
                                rule.Metric = metric;
                                metric.MetricRules.Add(rule);
                                rule.Value = rule_value;
                            }
                        }

                        // add standards
                        foreach(var s in standards)
                        {
                            var standard = ObjectSpace.CreateObject<Standard>();
                            standard.Name = s;
                            standard.Assessment = assessment;
                            assessment.Standards.Add(standard);
                        }
                    }
                }
            }

#if !RELEASE

            // add one assessor
            ApplicationUser assessorUser = ObjectSpace.FirstOrDefault<ApplicationUser>(u => u.UserName == "Assessor");
            if(assessorUser == null) {
                assessorUser = ObjectSpace.CreateObject<ApplicationUser>();
                assessorUser.UserName = "Assessor";
                assessorUser.SetPassword("");
                // save user to get key id
                ObjectSpace.CommitChanges();
                ((ISecurityUserWithLoginInfo)assessorUser).CreateUserLoginInfo(SecurityDefaults.PasswordAuthentication, ObjectSpace.GetKeyValueAsString(assessorUser));
                // give assessors role
                assessorUser.Roles.Add(role2policy["Assessors"]);
                ObjectSpace.CommitChanges();
            }

            // add one external
            ApplicationUser externalUser = ObjectSpace.FirstOrDefault<ApplicationUser>(u => u.UserName == "External");
            if (externalUser == null)
            {
                externalUser = ObjectSpace.CreateObject<ApplicationUser>();
                externalUser.UserName = "External";
                externalUser.SetPassword("");
                // save user to get key id
                ObjectSpace.CommitChanges();
                ((ISecurityUserWithLoginInfo)externalUser).CreateUserLoginInfo(SecurityDefaults.PasswordAuthentication, ObjectSpace.GetKeyValueAsString(externalUser));
                // give assessors role
                externalUser.Roles.Add(role2policy["Externals"]);
                ObjectSpace.CommitChanges();
            }
#endif
        }
        public override void UpdateDatabaseBeforeUpdateSchema() {
            base.UpdateDatabaseBeforeUpdateSchema();
            //if(CurrentDBVersion < new Version("1.1.0.0") && CurrentDBVersion > new Version("0.0.0.0")) {
            //    RenameColumn("DomainObject1Table", "OldColumnName", "NewColumnName");
            //}
        }
    }
}
