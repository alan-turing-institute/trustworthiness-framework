namespace TF.Module.Web.Controllers
{
    partial class AssessmentController
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
            this.asCompareAssessments = new DevExpress.ExpressApp.Actions.SimpleAction(this.components);
            this.asNewVersion = new DevExpress.ExpressApp.Actions.SimpleAction(this.components);
            // 
            // asCompareAssessments
            // 
            this.asCompareAssessments.Caption = "Compare Assessments";
            this.asCompareAssessments.ConfirmationMessage = null;
            this.asCompareAssessments.Id = "70193d13-ba28-4c40-a2b6-f205ea25071e";
            this.asCompareAssessments.SelectionDependencyType = DevExpress.ExpressApp.Actions.SelectionDependencyType.RequireMultipleObjects;
            this.asCompareAssessments.TargetObjectType = typeof(TF.Module.BusinessObjects.Assessment);
            this.asCompareAssessments.ToolTip = null;
            this.asCompareAssessments.Execute += new DevExpress.ExpressApp.Actions.SimpleActionExecuteEventHandler(this.asCompareAssessments_Execute);
            // 
            // asNewVersion
            // 
            this.asNewVersion.Caption = "New Version";
            this.asNewVersion.Category = "ObjectsCreation";
            this.asNewVersion.ConfirmationMessage = null;
            this.asNewVersion.Id = "e9e637f5-d7e7-43b2-bb1a-2fd9c23ae08b";
            this.asNewVersion.SelectionDependencyType = DevExpress.ExpressApp.Actions.SelectionDependencyType.RequireSingleObject;
            this.asNewVersion.TargetObjectType = typeof(TF.Module.BusinessObjects.Assessment);
            this.asNewVersion.ToolTip = null;
            this.asNewVersion.Execute += new DevExpress.ExpressApp.Actions.SimpleActionExecuteEventHandler(this.asNewVersion_Execute);
            // 
            // AssessmentController
            // 
            this.Actions.Add(this.asCompareAssessments);
            this.Actions.Add(this.asNewVersion);
            this.TargetObjectType = typeof(TF.Module.BusinessObjects.Assessment);
            this.TargetViewType = DevExpress.ExpressApp.ViewType.ListView;

        }

        #endregion

        private DevExpress.ExpressApp.Actions.SimpleAction asCompareAssessments;
        private DevExpress.ExpressApp.Actions.SimpleAction asNewVersion;
    }
}
