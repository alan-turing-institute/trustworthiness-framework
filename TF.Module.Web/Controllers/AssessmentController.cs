using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Actions;
using DevExpress.ExpressApp.Editors;
using DevExpress.ExpressApp.Layout;
using DevExpress.ExpressApp.Model.NodeGenerators;
using DevExpress.ExpressApp.ReportsV2;
using DevExpress.ExpressApp.SystemModule;
using DevExpress.ExpressApp.Templates;
using DevExpress.ExpressApp.Utils;
using DevExpress.ExpressApp.Web;
using DevExpress.Persistent.Base;
using DevExpress.Persistent.BaseImpl;
using DevExpress.Persistent.Validation;
using DevExpress.XtraReports.UI;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;
using TF.Module.BusinessObjects;

namespace TF.Module.Web.Controllers
{
    // For more typical usage scenarios, be sure to check out https://documentation.devexpress.com/eXpressAppFramework/clsDevExpressExpressAppViewControllertopic.aspx.
    public partial class AssessmentController : ViewController
    {
        // Use CodeRush to create Controllers and Actions with a few keystrokes.
        // https://docs.devexpress.com/CodeRushForRoslyn/403133/
        public AssessmentController()
        {
            InitializeComponent();
            // Target required Views (via the TargetXXX properties) and create their Actions.
        }
        protected override void OnActivated()
        {
            base.OnActivated();
            // Perform various tasks depending on the target View.
            View.SelectionChanged += View_SelectionChanged;
        }

        private void View_SelectionChanged(object sender, EventArgs e)
        {
            asCompareAssessments.Enabled["noAssessments"] = View.SelectedObjects.Count == 2;
        }

        protected override void OnViewControlsCreated()
        {
            base.OnViewControlsCreated();
            // Access and customize the target View control.
        }
        protected override void OnDeactivated()
        {
            // Unsubscribe from previously subscribed events and release other references and resources.
            base.OnDeactivated();
        }

        private void asCompareAssessments_Execute(object sender, SimpleActionExecuteEventArgs e)
        {
            // start report assessment comparison
            IObjectSpace objectSpace = ReportDataProvider.ReportObjectSpaceProvider.CreateObjectSpace(typeof(ReportDataV2));
            IReportDataV2 reportData = objectSpace.FirstOrDefault<ReportDataV2>(data => data.DisplayName == "Assessment Comparison Report");
            if (reportData == null)
            {
                throw new UserFriendlyException("Cannot find the 'Assessment Comparison Report' report.");
            }
            else
            {
                string handle = ReportDataProvider.ReportsStorage.GetReportContainerHandle(reportData);
                ReportServiceController controller = Frame.GetController<ReportServiceController>();
                if (controller == null)
                {
                    throw new UserFriendlyException("Cannot find the 'ReportServiceController'.");
                }
                else
                {
                    var as1 = (Assessment)View.SelectedObjects[0];
                    var as2 = (Assessment)View.SelectedObjects[1];
                    controller.ShowPreview(handle, CriteriaOperator.Parse("[Oid] in (?,?)",as1.Oid, as2.Oid));
                }
            }
        }

        private void asNewVersion_Execute(object sender, SimpleActionExecuteEventArgs e)
        {
            // create a new assessment
            var prevAssessment = View.CurrentObject as Assessment;
            IObjectSpace os = Application.CreateObjectSpace();
            var assessment = os.CreateObject<Assessment>();
            assessment.Code = prevAssessment.Code + " Copy";
            assessment.Name = prevAssessment.Name + " Copy";
            assessment.Status = Assessment.EAssessmentStatus.Draft;
            assessment.CreatedOn = DateTime.Now;
            assessment.FillFromPreviousAssessment(prevAssessment);
            // and go to its detail view
            var detailView = Application.CreateDetailView(os, assessment);
            detailView.ViewEditMode = ViewEditMode.Edit;
            e.ShowViewParameters.CreatedView = detailView;
        }
    }
}
