namespace TF.Module.Web.Controllers
{
    partial class MetricListController
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary> 
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Component Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            this.asShowDetails = new DevExpress.ExpressApp.Actions.SimpleAction(this.components);
            // 
            // asShowDetails
            // 
            this.asShowDetails.Caption = "Info";
            this.asShowDetails.Category = "RecordEdit";
            this.asShowDetails.ConfirmationMessage = null;
            this.asShowDetails.Id = "2b116b71-9f13-4098-ba61-49623410a1d0";
            this.asShowDetails.SelectionDependencyType = DevExpress.ExpressApp.Actions.SelectionDependencyType.RequireSingleObject;
            this.asShowDetails.ToolTip = null;
            this.asShowDetails.Execute += new DevExpress.ExpressApp.Actions.SimpleActionExecuteEventHandler(this.asShowDetails_Execute);
            // 
            // MetricListController
            // 
            this.Actions.Add(this.asShowDetails);
            this.TargetObjectType = typeof(TF.Module.BusinessObjects.Metric);
            this.TargetViewType = DevExpress.ExpressApp.ViewType.ListView;

        }

        #endregion

        private DevExpress.ExpressApp.Actions.SimpleAction asShowDetails;
    }
}
