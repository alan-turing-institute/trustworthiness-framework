using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.DC;
using DevExpress.ExpressApp.Model;
using DevExpress.Persistent.Base;
using DevExpress.Persistent.Validation;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using static TF.Module.BusinessObjects.Metric;

namespace TF.Module.BusinessObjects
{
    [DomainComponent]
    [NavigationItem(false)]
    public class MechanismComparison : IXafEntityObject/*, IObjectSpaceLink*/, INotifyPropertyChanged
    {
        //private IObjectSpace objectSpace;
        private void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
        public MechanismComparison()
        {
            Oid = Guid.NewGuid();
        }

        [DevExpress.ExpressApp.Data.Key]
        [Browsable(false)]  // Hide the entity identifier from UI.
        public Guid Oid { get; set; }

        public string Code { get; set; }
        public string Name { get; set; }
        public int DesignWeight { get; set; }
        public int OperationalWeight { get; set; }
        public List<MetricComparison> Metrics { get; set; }
        public int DesignScore1 
        { 
            get
            {
                var designMetrics = Metrics.Where(m => m.Phase == EMetricPhase.Design);
                var weight = designMetrics.Sum(m => m.Weight);
                return weight == 0 ? 0 : designMetrics.Sum(m => m.ScoreValue1 * m.Weight) / weight;
            }
        }
        public int DesignScore2
        {
            get
            {
                var designMetrics = Metrics.Where(m => m.Phase == EMetricPhase.Design);
                var weight = designMetrics.Sum(m => m.Weight);
                return weight == 0 ? 0 : designMetrics.Sum(m => m.ScoreValue2 * m.Weight) / weight;
            }
        }
        public int OperationalScore1
        {
            get
            {
                var operationalMetrics = Metrics.Where(m => m.Phase == EMetricPhase.Operational);
                var weight = operationalMetrics.Sum(m => m.Weight);
                return weight == 0 ? 0 : operationalMetrics.Sum(m => m.ScoreValue1 * m.Weight) / weight;
            }
        }
        public int OperationalScore2
        {
            get
            {
                var operationalMetrics = Metrics.Where(m => m.Phase == EMetricPhase.Operational);
                var weight = operationalMetrics.Sum(m => m.Weight);
                return weight == 0 ? 0 : operationalMetrics.Sum(m => m.ScoreValue2 * m.Weight) / weight;
            }
        }

        #region IXafEntityObject members (see https://documentation.devexpress.com/eXpressAppFramework/clsDevExpressExpressAppIXafEntityObjecttopic.aspx)
        void IXafEntityObject.OnCreated()
        {
            // Place the entity initialization code here.
            // You can initialize reference properties using Object Space methods; e.g.:
            // this.Address = objectSpace.CreateObject<Address>();
        }
        void IXafEntityObject.OnLoaded()
        {
            // Place the code that is executed each time the entity is loaded here.
        }
        void IXafEntityObject.OnSaving()
        {
            // Place the code that is executed each time the entity is saved here.
        }
        #endregion

        #region IObjectSpaceLink members (see https://documentation.devexpress.com/eXpressAppFramework/clsDevExpressExpressAppIObjectSpaceLinktopic.aspx)
        // If you implement this interface, handle the NonPersistentObjectSpace.ObjectGetting event and find or create a copy of the source object in the current Object Space.
        // Use the Object Space to access other entities (see https://documentation.devexpress.com/eXpressAppFramework/CustomDocument113707.aspx).
        //IObjectSpace IObjectSpaceLink.ObjectSpace {
        //    get { return objectSpace; }
        //    set { objectSpace = value; }
        //}
        #endregion

        #region INotifyPropertyChanged members (see http://msdn.microsoft.com/en-us/library/system.componentmodel.inotifypropertychanged(v=vs.110).aspx)
        public event PropertyChangedEventHandler PropertyChanged;
        #endregion
    }
}