using DevExpress.Xpo.Metadata;
using DevExpress.Xpo;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TF.Module.BusinessObjects
{
    public class CloneHelper : IDisposable
    {
        readonly Dictionary<object, object> clonedObjects;
        readonly Session targetSession;

        public CloneHelper(Session targetSession)
        {
            clonedObjects = new Dictionary<object, object>();
            this.targetSession = targetSession;
        }

        public T Clone<T>(T source)
        {
            return Clone<T>(source, false);
        }
        public T Clone<T>(T source, bool synchronize)
        {
            return (T)Clone((object)source, synchronize);
        }
        public object Clone(object source)
        {
            return Clone(source, false);
        }

        /// <param name="synchronize">If set to true, reference properties are only cloned in case
        /// the reference object does not exist in the targetsession. Otherwise the exising object will be
        /// reused and synchronized with the source. Set this property to false when knowing at forehand 
        /// that the targetSession will not contain any of the objects of the source.</param>
        /// <returns></returns>
        public object Clone(object source, object target, bool synchronize)
        {
            if (source == null)
                return null;
            XPClassInfo targetClassInfo = targetSession.GetClassInfo(source.GetType());
            if(target == null)
            {
                target = targetClassInfo.CreateNewObject(targetSession);
            }
            clonedObjects.Add(source, target);

            foreach (XPMemberInfo m in targetClassInfo.PersistentProperties)
            {
                CloneProperty(m, source, target, synchronize);
            }
            foreach (XPMemberInfo m in targetClassInfo.CollectionProperties)
            {
                CloneCollection(m, source, target, synchronize);
            }
            return target;
        }
        private void CloneProperty(XPMemberInfo memberInfo, object source, object target, bool synchronize)
        {
            if (memberInfo is DevExpress.Xpo.Metadata.Helpers.ServiceField || memberInfo.IsKey)
            {
                return;
            }
            object clonedValue = null;
            if (memberInfo.ReferenceType != null)
            {
                object value = memberInfo.GetValue(source);
                if (value != null)
                {
                    clonedValue = CloneValue(value, synchronize, false);
                }
            }
            else
            {
                clonedValue = memberInfo.GetValue(source);
            }
            memberInfo.SetValue(target, clonedValue);
        }
        private void CloneCollection(XPMemberInfo memberInfo, object source, object target, bool synchronize)
        {
            if (memberInfo.IsAssociation && (memberInfo.IsManyToMany || memberInfo.IsAggregated))
            {
                XPBaseCollection colTarget = (XPBaseCollection)memberInfo.GetValue(target);
                XPBaseCollection colSource = (XPBaseCollection)memberInfo.GetValue(source);
                foreach (IXPSimpleObject obj in colSource)
                {
                    colTarget.BaseAdd(CloneValue(obj, synchronize, !memberInfo.IsManyToMany));
                }
            }
        }
        private object CloneValue(object propertyValue, bool synchronize, bool cloneAlways)
        {
            if (clonedObjects.ContainsKey(propertyValue))
            {
                return clonedObjects[propertyValue];
            }
            object clonedValue = null;
            if (synchronize && !cloneAlways)
            {
                clonedValue = targetSession.GetObjectByKey(targetSession.GetClassInfo(propertyValue), targetSession.GetKeyValue(propertyValue));
            }
            if (clonedValue == null)
            {
                clonedValue = Clone(propertyValue, null, synchronize);
            }
            return clonedValue;
        }

        public void Dispose()
        {
            if (targetSession != null)
                targetSession.Dispose();
        }
    }
}
