import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Settings2, Plus, Trash2, Star, Loader2 } from "lucide-react";
import t from "@/lib/i18n";

interface ExportTemplatesDialogProps {
  onSelectTemplate: (fields: string[]) => void;
}

export default function ExportTemplatesDialog({ onSelectTemplate }: ExportTemplatesDialogProps) {
  const [open, setOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const fieldsQuery = trpc.exportTemplates.getAvailableFields.useQuery();
  const templatesQuery = trpc.exportTemplates.list.useQuery();
  const createMutation = trpc.exportTemplates.create.useMutation();
  const deleteMutation = trpc.exportTemplates.delete.useMutation();
  const updateMutation = trpc.exportTemplates.update.useMutation();

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error(t.export.enterTemplateName);
      return;
    }
    if (selectedFields.length === 0) {
      toast.error(t.export.selectAtLeastOne);
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: newTemplateName.trim(),
        fields: selectedFields,
        isDefault: false,
      });
      toast.success(t.export.templateCreated);
      setNewTemplateName("");
      setSelectedFields([]);
      setIsCreating(false);
      templatesQuery.refetch();
    } catch (error) {
      toast.error(t.export.failedToCreate);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success(t.export.templateDeleted);
      templatesQuery.refetch();
    } catch (error) {
      toast.error(t.export.failedToDelete);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await updateMutation.mutateAsync({ id, isDefault: true });
      toast.success(t.export.defaultUpdated);
      templatesQuery.refetch();
    } catch (error) {
      toast.error(t.export.failedToUpdate);
    }
  };

  const handleUseTemplate = (fields: string[]) => {
    onSelectTemplate(fields);
    setOpen(false);
    toast.success(t.export.templateApplied);
  };

  const handleSelectAll = () => {
    if (fieldsQuery.data) {
      setSelectedFields(fieldsQuery.data.map(f => f.key));
    }
  };

  const handleSelectNone = () => {
    setSelectedFields([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          {t.export.exportSettings}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.export.exportTemplates}</DialogTitle>
          <DialogDescription>
            {t.export.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Saved Templates */}
          <div>
            <h3 className="text-sm font-medium mb-3">{t.export.savedTemplates}</h3>
            {templatesQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templatesQuery.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t.export.noTemplates}</p>
            ) : (
              <div className="space-y-2">
                {templatesQuery.data?.map((template) => (
                  <div 
                    key={template.id} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.name}</span>
                      {template.isDefault === "yes" && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {t.export.default}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {template.fields?.length || 0} {t.export.fields}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUseTemplate(template.fields || [])}
                      >
                        {t.export.use}
                      </Button>
                      {template.isDefault !== "yes" && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSetDefault(template.id)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Template */}
          {isCreating ? (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="templateName">{t.export.templateName}</Label>
                <Input
                  id="templateName"
                  placeholder={t.export.templateNamePlaceholder}
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t.export.selectFields}</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                      {t.export.selectAll}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                      {t.export.clear}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {fieldsQuery.data?.map((field) => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.key}
                        checked={selectedFields.includes(field.key)}
                        onCheckedChange={() => handleFieldToggle(field.key)}
                      />
                      <label
                        htmlFor={field.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateTemplate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t.export.saveTemplate}
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  {t.common.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t.export.createNew}
            </Button>
          )}

          {/* Quick Export Options */}
          <div>
            <h3 className="text-sm font-medium mb-3">{t.export.quickExport}</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleUseTemplate(["phoneNumber", "validNumber", "currentCarrierName", "countryName"])}
              >
                {t.export.basic} (4 {t.export.fields})
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleUseTemplate([
                  "phoneNumber", "internationalFormat", "validNumber", "reachable",
                  "countryName", "currentCarrierName", "ported", "roaming", "healthScore"
                ])}
              >
                {t.export.standard} (9 {t.export.fields})
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleUseTemplate(fieldsQuery.data?.map(f => f.key) || [])}
              >
                {t.export.full} ({t.export.allFields})
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.common.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
