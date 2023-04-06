using DevExpress.EasyTest.Framework;
using System;
using System.Linq;
using Xunit;

namespace TF.Module.E2E.Tests {
	public class TFUserChangePasswordTests : IDisposable {
        const string WebAppName = "TF";
        const string AppDBName = "TF";

        EasyTestFixtureContext FixtureContext { get; } = new EasyTestFixtureContext();

		public TFUserChangePasswordTests() {
            FixtureContext.RegisterApplications(
                new WebApplicationOptions(WebAppName, string.Format(@"{0}\..\..\..\..\TF.Web", Environment.CurrentDirectory))
            );
            // FixtureContext.RegisterDatabases(new DatabaseOptions(AppDBName, "TFEasyTest", server: @"(localdb)\mssqllocaldb"));	
            // 
            // delete file if exists
            string dbfile = "E:/Workspace/TF/TF.Web/Data/TF.db";
            if (System.IO.File.Exists(dbfile))
                System.IO.File.Delete(dbfile);
        }
        public void Dispose() {
            FixtureContext.CloseRunningApplications();
        }

        private IApplicationContext Login(string applicationName, string userName = "Admin")
        {
            // login
            var appContext = FixtureContext.CreateApplicationContext(applicationName);
            appContext.RunApplication();
            appContext.GetForm().FillForm(
                ("User Name", userName),
                ("Password", "")
            );
            appContext.GetAction("Log In").Execute();
            return appContext;
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestUserNeedsPreviousPassword(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            appContext.Navigate("My Details");
            appContext.GetAction("Change My Password").Execute();
            appContext.GetForm().FillForm(
                ("Old Password", "InvalidPwd"),
                ("New Password", "NewPwd"),
                ("Confirm Password", "NewPwd")
                );
            appContext.GetAction("OK").Execute();
            // check error
            Assert.Equal("Old password is wrong.", appContext.GetValidation().GetValidationHeader());
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestUserChangesHisPassword(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            appContext.Navigate("My Details");
            appContext.GetAction("Change My Password").Execute();
            appContext.GetForm().FillForm(
                ("Old Password", ""),
                ("New Password", "NewPwd"),
                ("Confirm Password", "NewPwd")
                );
            appContext.GetAction("OK").Execute();
            // check error
            Assert.Equal("", appContext.GetValidation().GetValidationHeader());
        }
    }
}
