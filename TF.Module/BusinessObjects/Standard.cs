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
    [NavigationItem(false)]
    public class Standard : TFBaseObject
    {
        
        public Standard(Session session)
            : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();
            
        }

        string name;
        Assessment assessment;
        bool compliant;

        [Size(200)]
        [RuleRequiredField(DefaultContexts.Save)]
        [ModelDefault("AllowEdit", "False")]
        public string Name
        {
            get => name;
            set => SetPropertyValue(nameof(Name), ref name, value);
        }

        [Association("Assessment-Standards")]
        public Assessment Assessment
        {
            get { return assessment; }
            set { SetPropertyValue(nameof(Assessment), ref assessment, value); }
        }

        [Browsable(false)]
        [Association("Standard-MetricStandard"), Aggregated]
        public XPCollection<MetricStandard> MetricStandards => GetCollection<MetricStandard>(nameof(MetricStandards));

        public bool Compliant
        {
            get => compliant;
            set
            {
                if(SetPropertyValue(nameof(Compliant), ref compliant, value))
                {
                    if(compliant && !IsLoading)
                    {
                        foreach (var metric_standard in MetricStandards)
                        {
                            var metric = metric_standard.Metric;
                            if (metric.ScoreValue != 100)
                            {
                                if (metric.MetricType == Metric.EMetricType.Boolean)
                                {
                                    metric.BooleanValue = true;
                                }
                                else
                                {
                                    metric.PercentageValue = 100;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}