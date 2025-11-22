import { expect, fixture, html } from '@open-wc/testing';

import { Button } from './button';

describe('Button', () => {
  it('should render without errors', async () => {
    const el = await fixture<Button>(html`<ui-button>Click me</ui-button>`);
    expect(el).to.exist;
    expect(el.textContent?.trim()).to.equal('Click me');
  });

  it('should have button role and be keyboard accessible', async () => {
    const el = await fixture<Button>(html`<ui-button>Test</ui-button>`);
    expect(el.getAttribute('role')).to.equal('button');
    expect(el.tabIndex).to.equal(0);
  });

  it('should apply variant classes', async () => {
    const el = await fixture<Button>(
      html`<ui-button variant="destructive">Delete</ui-button>`,
    );
    expect(el.variant).to.equal('destructive');
    expect(el.className).to.include('bg-destructive');
  });

  it('should apply size classes', async () => {
    const el = await fixture<Button>(html`<ui-button size="sm">Small</ui-button>`);
    expect(el.size).to.equal('sm');
    expect(el.className).to.include('h-8');
  });

  it('should handle disabled state', async () => {
    const el = await fixture<Button>(
      html`<ui-button disabled>Disabled</ui-button>`,
    );
    expect(el.disabled).to.be.true;
    expect(el.getAttribute('aria-disabled')).to.equal('true');
  });

  it('should respond to click events', async () => {
    let clicked = false;
    const el = await fixture<Button>(
      html`<ui-button @click=${() => {
        clicked = true;
      }}>Click</ui-button>`,
    );

    el.click();
    expect(clicked).to.be.true;
  });

  it('should respond to Enter key', async () => {
    let activated = false;
    const el = await fixture<Button>(
      html`<ui-button @click=${() => {
        activated = true;
      }}>Test</ui-button>`,
    );

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(event);

    expect(activated).to.be.true;
  });

  it('should respond to Space key', async () => {
    let activated = false;
    const el = await fixture<Button>(
      html`<ui-button @click=${() => {
        activated = true;
      }}>Test</ui-button>`,
    );

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(event);

    expect(activated).to.be.true;
  });

  it('should not respond to click when disabled', async () => {
    let clicked = false;
    const el = await fixture<Button>(
      html`<ui-button disabled @click=${() => {
        clicked = true;
      }}>Disabled</ui-button>`,
    );

    el.click();
    expect(clicked).to.be.false;
  });
});
