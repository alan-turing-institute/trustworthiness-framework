using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.ConditionalAppearance;
using DevExpress.ExpressApp.DC;
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
using static TF.Module.BusinessObjects.Metric;

namespace TF.Module.BusinessObjects
{
    [DefaultClassOptions]
    [NavigationItem(false)]
    public class MetricRule : BaseObject
    {
        public MetricRule(Session session)
            : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();
        }

        int metricValue;
        Metric metric;
        MechanismChoice mechanismChoice;

        [Association("MechanismChoice-MetricRule")]
        public MechanismChoice Choice
        {
            get { return mechanismChoice; }
            set { SetPropertyValue(nameof(Choice), ref mechanismChoice, value); }
        }

        [Association("Metric-MetricRule")]
        public Metric Metric
        {
            get { return metric; }
            set { SetPropertyValue(nameof(Metric), ref metric, value); }
        }

        public int Value
        {
            get { return metricValue; }
            set { SetPropertyValue(nameof(Value), ref metricValue, value); }
        }
    }
}