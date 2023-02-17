using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.ConditionalAppearance;
using DevExpress.ExpressApp.Editors;
using DevExpress.ExpressApp.Model;
using DevExpress.Persistent.Base;
using DevExpress.Persistent.BaseImpl;
using DevExpress.Persistent.Validation;
using DevExpress.Xpo;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;

namespace TF.Module.BusinessObjects
{
    [DefaultClassOptions]
    public class Assessment : BaseObject
    {
        public enum EAssessmentStatus
        {
            Draft,
            Private,
            Public
        }
        
        public Assessment(Session session)
            : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();
            
            // copy from template
            var template = Session.FindObject<Assessment>(CriteriaOperator.Parse("Code = 'MASTER'"));
            if (template != null)
            {
                var cloneHelper = new CloneHelper(Session);
                cloneHelper.Clone(template, this, false);
            }

            Status = EAssessmentStatus.Draft;
            Code = "";
            Name = "";

            // set created on
            CreatedOn = DateTime.Now;
        }

        string description;
        string name;
        string code;
        EAssessmentStatus status;
        DateTime createdOn;

        public EAssessmentStatus Status
        {
            get => status;
            set => SetPropertyValue(nameof(Status), ref status, value);
        }

        [Size(20)]
        [RuleRequiredField(DefaultContexts.Save)]
        [RuleUniqueValue("AssessmentCodeUnique", DefaultContexts.Save, CriteriaEvaluationBehavior = CriteriaEvaluationBehavior.BeforeTransaction)]
        public string Code
        {
            get => code;
            set => SetPropertyValue(nameof(Code), ref code, value);
        }

        [Size(200)]
        [RuleRequiredField(DefaultContexts.Save)]
        public string Name
        {
            get => name;
            set => SetPropertyValue(nameof(Name), ref name, value);
        }

        [Size(SizeAttribute.Unlimited)]
        public string Description
        {
            get => description;
            set => SetPropertyValue(nameof(Description), ref description, value);
        }

        [Browsable(false)]
        public DateTime CreatedOn
        {
            get => createdOn;
            set => SetPropertyValue(nameof(CreatedOn), ref createdOn, value);
        }

        [Association("Assessment-Pillars"), Aggregated]
        public XPCollection<Pillar> Pillars => GetCollection<Pillar>(nameof(Pillars));
    }
}