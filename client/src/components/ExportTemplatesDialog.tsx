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
      toast.error("Enter template name");
      return;
    }
    if (selectedFields.length === 0) {
      toast.error("Select at least one field");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: newTemplateName.trim(),
        fields: selectedFields,
        isDefault: false,
      });
      toast.success("Template created");
      setNewTemplateName("");
      setSelectedFields([]);
      setIsCreating(false);
      templatesQuery.refetch();
    } catch (error) {
      toast.error("Failed to create template");
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Template deleted");
      templatesQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await updateMutation.mutateAsync({ id, isDefault: true });
      toast.success("Default template updated");
      templatesQuery.refetch();
    } catch (error) {
      toast.error("Failed to update template");
    }
  };

  const handleUseTemplate = (fields: string[]) => {
    onSelectTemplate(fields);
    setOpen(false);
    toast.success("Template applied");
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
          Export Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Templates</DialogTitle>
          <DialogDescription>
            Create and manage custom export templates to select which fields to include in CSV exports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Saved Templates */}
          <div>
            <h3 className="text-sm font-medium mb-3">Saved Templates</h3>
            {templatesQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templatesQuery.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No saved templates yet</p>
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
                          Default
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {template.fields?.length || 0} fields
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUseTemplate(template.fields || [])}
                      >
                        Use
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
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  placeholder="e.g., Basic Export, Full Details..."
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Fields</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                      Clear
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
                  Save Template
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
          )}

          {/* Quick Export Options */}
          <div>
            <h3 className="text-sm font-medium mb-3">Quick Export</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleUseTemplate(["phoneNumber", "validNumber", "currentCarrierName", "countryName"])}
              >
                Basic (4 fields)
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleUseTemplate([
                  "phoneNumber", "internationalFormat", "validNumber", "reachable",
                  "countryName", "currentCarrierName", "ported", "roaming", "healthScore"
                ])}
              >
                Standard (9 fields)
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleUseTemplate(fieldsQuery.data?.map(f => f.key) || [])}
              >
                Full (all fields)
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
