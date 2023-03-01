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
    public class Assessment : TFBaseObject
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
        }

        string description;
        string name;
        string code;
        EAssessmentStatus status;

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

        [Association("Assessment-Pillars"), Aggregated]
        public XPCollection<Pillar> Pillars => GetCollection<Pillar>(nameof(Pillars));

        [Association("Assessment-Standards"), Aggregated]
        public XPCollection<Standard> Standards => GetCollection<Standard>(nameof(Standards));

        // fill metrics using a previous assessment
        public void FillFromPreviousAssessment(Assessment prev)
        {
            // fill the comparison
            foreach (var pillar1 in Pillars)
            {
                // pillars
                var pillar2 = prev.Pillars.SingleOrDefault(p => p.Code == pillar1.Code);
                if (pillar2 != null)
                {
                    // mechanisms
                    foreach (var mechanism1 in pillar1.Mechanisms)
                    {
                        var mechanism2 = pillar2.Mechanisms.SingleOrDefault(m => m.Code == mechanism1.Code);
                        if (mechanism2 != null)
                        {
                            // metrics
                            foreach (var metric1 in mechanism1.Metrics)
                            {
                                var metric2 = mechanism2.Metrics.SingleOrDefault(m => 
                                    m.Code == metric1.Code
                                 && m.Phase == metric1.Phase
                                 && m.MetricType == metric1.MetricType);
                                if (metric2 != null)
                                {
                                    metric1.BooleanValue= metric2.BooleanValue;
                                    metric1.PercentageValue= metric2.PercentageValue;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}