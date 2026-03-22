import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@/components/data-input/form-field";
import { Modal } from "@/components/actions/modal";

export function QuickCaptureModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setValue("");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <Modal ariaLabelledBy="quick-capture-title" className="quick-capture" onClose={onClose}>
      <form className="quick-capture__form" onSubmit={handleSubmit}>
        <p id="quick-capture-title" className="quick-capture__title">
          Quick Capture
        </p>
        <FormField>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="modal-form__input ui-input"
            placeholder="Capture a thought"
            aria-label="Capture a thought"
            autoFocus
          />
        </FormField>
      </form>
    </Modal>
  );
}
