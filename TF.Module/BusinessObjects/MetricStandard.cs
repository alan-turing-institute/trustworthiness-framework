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
    public class MetricStandard : TFBaseObject
    {
        public MetricStandard(Session session)
            : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();
        }

        Metric metric;
        Standard standard;

        [Association("Standard-MetricStandard")]
        public Standard Standard
        {
            get { return standard; }
            set { SetPropertyValue(nameof(Standard), ref standard, value); }
        }

        [Association("Metric-MetricStandard")]
        public Metric Metric
        {
            get { return metric; }
            set { SetPropertyValue(nameof(Metric), ref metric, value); }
        }
    }
}