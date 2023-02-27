using DevExpress.Data.Filtering;
using DevExpress.ExpressApp.Model;
using DevExpress.Persistent.BaseImpl;
using DevExpress.Xpo;
using System;

namespace TF.Module.BusinessObjects
{
    public class TFBaseObject : BaseObject
    {
        ApplicationUser GetCurrentUser()
        {
            return Session.FindObject<ApplicationUser>(CriteriaOperator.Parse("Oid=CurrentUserId()"));
        }

        ApplicationUser createdBy;
        [ModelDefault("AllowEdit", "False")]
        public ApplicationUser CreatedBy
        {
            get { return createdBy; }
            set { SetPropertyValue("CreatedBy", ref createdBy, value); }
        }

        DateTime createdOn;
        [ModelDefault("AllowEdit", "False"), ModelDefault("DisplayFormat", "G")]
        public DateTime CreatedOn
        {
            get { return createdOn; }
            set { SetPropertyValue("CreatedOn", ref createdOn, value); }
        }

        ApplicationUser updatedBy;
        [ModelDefault("AllowEdit", "False")]
        public ApplicationUser UpdatedBy
        {
            get { return updatedBy; }
            set { SetPropertyValue("UpdatedBy", ref updatedBy, value); }
        }

        DateTime updatedOn;
        [ModelDefault("AllowEdit", "False"), ModelDefault("DisplayFormat", "G")]
        public DateTime UpdatedOn
        {
            get { return updatedOn; }
            set { SetPropertyValue("UpdatedOn", ref updatedOn, value); }
        }

        public TFBaseObject(Session session) : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();
            CreatedOn = DateTime.Now;
            CreatedBy = GetCurrentUser();
        }

        protected override void OnSaving()
        {
            base.OnSaving();
            UpdatedOn = DateTime.Now;
            UpdatedBy = GetCurrentUser();
        }
    }
}
