using DevExpress.EasyTest.Framework;
using System;
using System.Linq;
using Xunit;

namespace TF.Module.E2E.Tests {
	public class TFRegisterUserTests : IDisposable {
        const string WebAppName = "TF";
        const string AppDBName = "TF";

        EasyTestFixtureContext FixtureContext { get; } = new EasyTestFixtureContext();

		public TFRegisterUserTests() {
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

        private IApplicationContext Login(string applicationName)
        {
            // login
            var appContext = FixtureContext.CreateApplicationContext(applicationName);
            appContext.RunApplication();
            appContext.GetForm().FillForm(
                ("User Name", "Admin"),
                ("Password", "")
            );
            appContext.GetAction("Log In").Execute();
            appContext.Navigate("Application User");
            return appContext;
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestMissingUserName(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName);
            // register
            appContext.GetAction("New").Execute();
            appContext.GetAction("Save").Execute();
            // check error
            Assert.NotEmpty(appContext.GetValidation().GetValidationMessages());
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestValidUser(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName);
            // register
            appContext.GetAction("New").Execute();
            appContext.GetForm().FillForm(
                ("User Name", "TestUser")
            );
            appContext.GetAction("Save").Execute();
            // check error
            Assert.Empty(appContext.GetValidation().GetValidationMessages());
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestDuplicateUser(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName);
            // register
            appContext.GetAction("New").Execute();
            appContext.GetForm().FillForm(
                ("User Name", "TestUser")
            );
            appContext.GetAction("Save").Execute();
            // create a second user with the same name
            appContext.GetAction("New").Execute();
            appContext.GetForm().FillForm(
                ("User Name", "TestUser")
            );
            appContext.GetAction("Save").Execute();
            // check error
            Assert.NotEmpty(appContext.GetValidation().GetValidationMessages());
        }
    }
}
