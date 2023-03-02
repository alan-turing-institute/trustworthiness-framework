using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Actions;
using DevExpress.ExpressApp.Editors;
using DevExpress.ExpressApp.Layout;
using DevExpress.ExpressApp.Model.NodeGenerators;
using DevExpress.ExpressApp.ReportsV2;
using DevExpress.ExpressApp.Security;
using DevExpress.ExpressApp.SystemModule;
using DevExpress.ExpressApp.Templates;
using DevExpress.ExpressApp.Utils;
using DevExpress.Persistent.Base;
using DevExpress.Persistent.Validation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace TF.Module.Web.Controllers
{
    // For more typical usage scenarios, be sure to check out https://documentation.devexpress.com/eXpressAppFramework/clsDevExpressExpressAppViewControllertopic.aspx.
    public partial class DetailViewController : ViewController<DetailView>
    {
        // Use CodeRush to create Controllers and Actions with a few keystrokes.
        // https://docs.devexpress.com/CodeRushForRoslyn/403133/
        public DetailViewController()
        {
            InitializeComponent();
            // Target required Views (via the TargetXXX properties) and create their Actions.
        }
        protected override void OnActivated()
        {
            // are we in user detail view?
            var resetPasswordController = Frame.GetController<ResetPasswordController>();
            if (resetPasswordController != null)
            {
                resetPasswordController.ActionStateUpdated += ResetPasswordController_ActionStateUpdated;
            }
            var changePasswordController = Frame.GetController<ChangePasswordController>();
            if (changePasswordController != null)
            {
                changePasswordController.ActionStateUpdated += ChangePasswordController_ActionStateUpdated;
            }
            var reportController = Frame.GetController<PrintSelectionBaseController>();
            if (reportController != null)
            {
                reportController.ShowInReportActionEnableMode = PrintSelectionBaseController.ActionEnabledMode.None;
            }

            base.OnActivated();
            // Perform various tasks depending on the target View.
            if(View.ViewEditMode == ViewEditMode.View)
            {
                View.ViewEditMode = ViewEditMode.Edit;
                ObjectSpace.SetModified(null);
            }
        }

        private void ChangePasswordController_ActionStateUpdated(object sender, EventArgs e)
        {
            var changePasswordController = (ChangePasswordController)sender;
            changePasswordController.Actions["ChangePasswordByUser"].Enabled.RemoveItem(BaseManagePasswordController.ObjectSpaceIsNotModifiedKey);
        }

        private void ResetPasswordController_ActionStateUpdated(object sender, EventArgs e)
        {
            var resetPasswordController = (ResetPasswordController)sender;
            resetPasswordController.Actions["ResetPassword"].Enabled.RemoveItem(BaseManagePasswordController.ObjectSpaceIsNotModifiedKey);
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
    }
}
