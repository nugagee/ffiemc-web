import React, { useEffect, useRef, useState } from 'react';
import api, { formatApiError } from '../../lib/api';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { toast } from 'sonner';
import { GripVertical, Plus, Pencil, Trash2 } from 'lucide-react';
import ImageUrlField, { isImageField } from './ImageUrlField';

const emptyFromFields = (fields) =>
  fields.reduce((acc, f) => {
    acc[f.name] = f.type === 'switch' ? false : '';
    return acc;
  }, {});

function collectionKeyFromPath(path) {
  const base = String(path || '').split('?')[0].replace(/^\//, '');
  return base.split('/')[0];
}

export const ContentManager = ({ title, path, fields, columns, feature }) => {
  const { can } = useAuth();
  const canEdit = feature ? can(feature, 'edit') : true;
  const canDelete = feature ? can(feature, 'delete') : true;
  const basePath = path.split('?')[0];
  const collection = collectionKeyFromPath(path);
  const { items, loading, reload } = useCollection(path);
  const [ordered, setOrdered] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFromFields(fields));
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [reordering, setReordering] = useState(false);
  const dragIndex = useRef(null);
  const orderedRef = useRef([]);
  const startOrderKey = useRef("");

  useEffect(() => {
    setOrdered(items);
  }, [items]);

  useEffect(() => {
    orderedRef.current = ordered;
  }, [ordered]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyFromFields(fields));
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const f = {};
    fields.forEach((fld) => { f[fld.name] = item[fld.name] ?? (fld.type === 'switch' ? false : ''); });
    setForm(f);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`${basePath}/${editing.id}`, form);
        toast.success(`${title} updated`);
      } else {
        await api.post(basePath, form);
        toast.success(`${title} created`);
      }
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`${basePath}/${deleteId}`);
      toast.success(`${title} deleted`);
      reload();
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const persistOrder = async (next) => {
    setOrdered(next);
    setReordering(true);
    try {
      await api.reorder(collection, next.map((item) => item.id));
      toast.success('Order saved');
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || 'Could not save order');
      reload();
    } finally {
      setReordering(false);
    }
  };

  const onDragStart = (index) => {
    dragIndex.current = index;
    startOrderKey.current = ordered.map((item) => item.id).join(",");
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    const next = [...ordered];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(index, 0, moved);
    dragIndex.current = index;
    setOrdered(next);
  };

  const onDragEnd = () => {
    dragIndex.current = null;
    const next = orderedRef.current;
    const nextKey = next.map((item) => item.id).join(",");
    if (nextKey && nextKey !== startOrderKey.current) {
      persistOrder(next);
    }
  };

  return (
    <div data-testid={`manager-${title.toLowerCase()}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">
            {ordered.length} item{ordered.length !== 1 ? 's' : ''}
            {canEdit && ordered.length > 1 ? ' · Drag the handle to rearrange' : ''}
            {reordering ? ' · Saving…' : ''}
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700" data-testid={`add-${title.toLowerCase()}-btn`}>
            <Plus className="h-4 w-4 mr-2" />Add {title}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : ordered.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          No {title.toLowerCase()} yet.{canEdit ? ` Click "Add ${title}" to create one.` : ''}
        </Card>
      ) : (
        <div className="space-y-3">
          {ordered.map((item, index) => (
            <Card
              key={item.id}
              className={`p-4 flex items-center gap-3 ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}
              data-testid={`row-${item.id}`}
              draggable={canEdit}
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={onDragEnd}
            >
              {canEdit && (
                <span className="text-gray-400 shrink-0" title="Drag to reorder" aria-hidden>
                  <GripVertical className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 truncate">{item[columns[0]]}</p>
                  {item.featured && <Badge className="bg-yellow-500 text-black">Featured</Badge>}
                  {item.published === false && <Badge variant="secondary">Draft</Badge>}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {columns.slice(1).map((c) => item[c]).filter(Boolean).join(' • ')}
                </p>
              </div>
              {(canEdit || canDelete) && (
                <div className="flex gap-2 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                  {canEdit && (
                    <Button size="icon" variant="outline" onClick={() => openEdit(item)} data-testid={`edit-${item.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="icon" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteId(item.id)} data-testid={`delete-${item.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto top-[5vh] translate-y-0">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {fields.map((f) => (
              <div key={f.name} className="space-y-2">
                {isImageField(f) ? (
                  <ImageUrlField
                    id={f.name}
                    label={f.label}
                    value={form[f.name]}
                    onChange={(v) => setForm({ ...form, [f.name]: v })}
                    hint={f.hint}
                  />
                ) : (
                  <>
                    <Label htmlFor={f.name}>{f.label}</Label>
                    {f.type === 'textarea' ? (
                      <Textarea id={f.name} rows={f.rows || 4} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} data-testid={`field-${f.name}`} />
                    ) : f.type === 'switch' ? (
                      <div className="flex items-center gap-2">
                        <Switch id={f.name} checked={!!form[f.name]} onCheckedChange={(v) => setForm({ ...form, [f.name]: v })} data-testid={`field-${f.name}`} />
                        <span className="text-sm text-gray-500">{f.hint}</span>
                      </div>
                    ) : (
                      <Input id={f.name} type={f.type === 'date' ? 'date' : 'text'} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} data-testid={`field-${f.name}`} />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700" data-testid="save-btn">{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {title.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-btn">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
