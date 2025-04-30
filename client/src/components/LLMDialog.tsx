import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LLMDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (query: string) => void;
  selectedText: string;
}

export const LLMDialog = ({ isOpen, onClose, onSend, selectedText }: LLMDialogProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    onSend(query);
    setQuery("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ask LLM</DialogTitle>
          <DialogDescription>
            Enter your query for the selected text
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="selected-text" className="text-right">
              Selected Text
            </Label>
            <div className="col-span-3 p-2 border rounded-md bg-gray-50">
              {selectedText}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="query" className="text-right">
              Query
            </Label>
            <Input
              id="query"
              className="col-span-3"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What would you like to know about this text?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 