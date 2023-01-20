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

            //string name = "MyName";
            //DomainObject1 theObject = ObjectSpace.FirstOrDefault<DomainObject1>(u => u.Name == name);
            //if(theObject == null) {
            //    theObject = ObjectSpace.CreateObject<DomainObject1>();
            //    theObject.Name = name;
            //}
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
