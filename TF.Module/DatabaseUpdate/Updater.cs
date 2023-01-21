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
                role2policy[role_name].IsAdministrative = role_name.Equals("Administrators");
            }
            // persists roles
            ObjectSpace.CommitChanges();

            // create an admin user
            ApplicationUser userAdmin = ObjectSpace.FirstOrDefault<ApplicationUser>(u => u.UserName == "Admin");
            if (userAdmin == null)
            {
                userAdmin = ObjectSpace.CreateObject<ApplicationUser>();
                userAdmin.UserName = "Admin";
                userAdmin.SetPassword("");
                // save user to get key id
                ObjectSpace.CommitChanges();
                ((ISecurityUserWithLoginInfo)userAdmin).CreateUserLoginInfo(SecurityDefaults.PasswordAuthentication, ObjectSpace.GetKeyValueAsString(userAdmin));
                // give administrators role
                userAdmin.Roles.Add(role2policy["Administrators"]);
                ObjectSpace.CommitChanges();
            }

            // add master assessment if not available
            Assessment assessment = ObjectSpace.FirstOrDefault<Assessment>(a => a.Code == "MASTER");
            if (assessment != null)
            {
                assessment.Delete();
                ObjectSpace.CommitChanges();
                assessment = null;
            }
            
            if(assessment == null)
            {
                assessment = ObjectSpace.CreateObject<Assessment>();
                assessment.Code = "MASTER";
                assessment.Name = "Master Assessment";

                // now open embedded excel file
                var assembly = Assembly.GetExecutingAssembly();
                var resourceName = "TF.Module.DatabaseUpdate.TF.xlsx";
                using (var stream = assembly.GetManifestResourceStream(resourceName))
                {
                    using (var reader = ExcelReaderFactory.CreateReader(stream))
                    {
                        var result = reader.AsDataSet();

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
                            mechanism.DesignQuestion = row[5].ToString();
                            mechanism.OperationalWeight = int.Parse(row[6].ToString());
                            mechanism.OperationalQuestion = row[7].ToString();

                            mechanism.Pillar = pillar;
                            pillar.Mechanisms.Add(mechanism);
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
                            metric.Weight = int.Parse(row[6].ToString());
                        }
                    }
                }
                
                ObjectSpace.CommitChanges();
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
