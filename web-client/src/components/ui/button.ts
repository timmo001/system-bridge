import { cva, type VariantProps } from "class-variance-authority";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { UIElement } from "~/mixins";

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90",
        outline:
          "border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

@customElement("ui-button")
export class Button extends UIElement {
  @property() variant: ButtonVariants["variant"] = "default";
  @property() size: ButtonVariants["size"] = "default";
  @property({ type: Boolean }) disabled = false;
  @property() type: "button" | "submit" | "reset" = "button";

  connectedCallback() {
    super.connectedCallback();
    // Apply button classes directly to host element
    this.updateStyles();
    // Make host element a button for accessibility
    this.setAttribute("role", "button");
    this.tabIndex = 0;

    // Add click handler to host
    this.addEventListener("click", this._handleClick);
    // Add keyboard handler for accessibility
    this.addEventListener("keydown", this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this._handleClick);
    this.removeEventListener("keydown", this._handleKeydown);
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (
      changedProperties.has("variant") ||
      changedProperties.has("size") ||
      changedProperties.has("disabled")
    ) {
      this.updateStyles();
    }
  }

  private updateStyles() {
    const classes = buttonVariants({
      variant: this.variant,
      size: this.size,
    });
    // eslint-disable-next-line wc/no-self-class
    this.setAttribute("class", classes);

    if (this.disabled) {
      this.setAttribute("aria-disabled", "true");
      this.style.pointerEvents = "none";
      this.style.opacity = "0.5";
    } else {
      this.removeAttribute("aria-disabled");
      this.style.pointerEvents = "";
      this.style.opacity = "";
    }
  }

  render() {
    // In Light DOM, we don't need to render anything -
    // the child content will display naturally as direct children
    return html``;
  }

  private _handleClick = (e: MouseEvent) => {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Handle form submission for submit buttons
    if (this.type === "submit") {
      const form = this.closest("form");
      if (form) {
        // Trigger form submission
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        return;
      }
    }

    this.dispatchEvent(
      new CustomEvent("button-click", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _handleKeydown = (e: KeyboardEvent) => {
    // Activate button on Enter or Space key
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Trigger a click event to reuse the existing click handler logic
      this.click();
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-button": Button;
  }
}
