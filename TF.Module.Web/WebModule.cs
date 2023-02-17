using System;
using System.Linq;
using System.Text;
using System.ComponentModel;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.DC;
using System.Collections.Generic;
using DevExpress.ExpressApp.Model;
using DevExpress.ExpressApp.Editors;
using DevExpress.ExpressApp.Actions;
using DevExpress.ExpressApp.Updating;
using DevExpress.ExpressApp.Model.Core;
using DevExpress.ExpressApp.Model.DomainLogics;
using DevExpress.ExpressApp.Model.NodeGenerators;
using DevExpress.Persistent.BaseImpl;
using DevExpress.ExpressApp.ReportsV2;
using TF.Module.BusinessObjects;
using TF.Module.Web.Reports;
using TF.Module.DatabaseUpdate;

namespace TF.Module.Web {
    [ToolboxItemFilter("Xaf.Platform.Web")]
    // For more typical usage scenarios, be sure to check out https://docs.devexpress.com/eXpressAppFramework/DevExpress.ExpressApp.ModuleBase.
    public sealed partial class TFAspNetModule : ModuleBase {
        //private void Application_CreateCustomModelDifferenceStore(Object sender, CreateCustomModelDifferenceStoreEventArgs e) {
        //    e.Store = new ModelDifferenceDbStore((XafApplication)sender, typeof(ModelDifference), true, "Web");
        //    e.Handled = true;
        //}
        NonPersistentObjectSpace nonPersistentObjectSpace;
        IObjectSpace persistentObjectSpace;
        private void Application_CreateCustomUserModelDifferenceStore(Object sender, CreateCustomModelDifferenceStoreEventArgs e) {
            e.Store = new ModelDifferenceDbStore((XafApplication)sender, typeof(ModelDifference), false, "Web");
            e.Handled = true;
        }
        public TFAspNetModule() {
            InitializeComponent();
        }
        public override IEnumerable<ModuleUpdater> GetModuleUpdaters(IObjectSpace objectSpace, Version versionFromDB) {
            PredefinedReportsUpdater predefinedReportsUpdater = new PredefinedReportsUpdater(Application, objectSpace, versionFromDB);
            predefinedReportsUpdater.AddPredefinedReport<AssessmentReport>("Assessment Report", typeof(Assessment), true);
            predefinedReportsUpdater.AddPredefinedReport<AssessmentComparisonReport>("Assessment Comparison Report", typeof(AssessmentComparison), true);

            return new ModuleUpdater[] { predefinedReportsUpdater };
        }
        public override void Setup(XafApplication application) {
            base.Setup(application);
            //application.CreateCustomModelDifferenceStore += Application_CreateCustomModelDifferenceStore;
            application.CreateCustomUserModelDifferenceStore += Application_CreateCustomUserModelDifferenceStore;
            // Manage various aspects of the application UI and behavior at the module level.
            application.SetupComplete += Application_SetupComplete;
        }

        private void Application_SetupComplete(object sender, EventArgs e)
        {
            Application.ObjectSpaceCreated += Application_ObjectSpaceCreated;
        }

        private void Application_ObjectSpaceCreated(object sender, ObjectSpaceCreatedEventArgs e)
        {
            nonPersistentObjectSpace = e.ObjectSpace as NonPersistentObjectSpace;
            if (nonPersistentObjectSpace != null)
            {
                nonPersistentObjectSpace.ObjectsGetting += ObjectSpace_ObjectsGetting;
            }
            else
            {
                persistentObjectSpace = e.ObjectSpace;
            }
        }

        private void ObjectSpace_ObjectsGetting(object sender, ObjectsGettingEventArgs e)
        {
            if (e.ObjectType == typeof(AssessmentComparison))
            {
                // get assessments
                var assessments = persistentObjectSpace.GetObjects<Assessment>(e.Criteria)
                    .OrderByDescending(a => a.CreatedOn).Take(2).ToList();
                e.Objects = new object[] { new AssessmentComparison(assessments[0], assessments[1]) };
            }
        }
    }
}
