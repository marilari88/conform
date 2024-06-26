import { type Page, test, expect } from '@playwright/test';
import { cut, paste, selectAll } from './helpers';

async function getForm(
	page: Page,
	search: {
		defaultValue?: string;
		delegateFocus?: boolean;
	} = {},
) {
	await page.goto(
		`/input-event?defaultValue=${search.defaultValue ?? ''}&delegateFocus=${
			search.delegateFocus ? 'yes' : 'no'
		}`,
	);

	return {
		baseInput: page.locator('[name="base-input"]'),
		nativeInput: page.locator('[name="native-input"]'),
		reset: page.locator('button:text("Reset")'),
		submit: page.locator('button:text("Submit")'),
		baseLogs: page.locator('ul#base-input > li'),
		nativeLogs: page.locator('ul#native-input > li'),
	};
}

function createLog(type: string, eventPhase: number) {
	return JSON.stringify({
		eventPhase,
		type,
		bubbles: true,
		cancelable: false,
	});
}

test('emits nothing on load', async ({ page }) => {
	const form = await getForm(page);

	await expect(form.nativeLogs).toHaveText([]);
	await expect(form.baseLogs).toHaveText([]);
});

test('emits events as native input', async ({ page }) => {
	const form = await getForm(page);
	const logs1 = [createLog('focus', 1), createLog('focus', 3)];

	await form.nativeInput.focus();
	await expect(form.baseLogs).toHaveText(logs1);
	await expect(form.nativeLogs).toHaveText(logs1);

	const logs2 = [
		createLog('focus', 1),
		createLog('focus', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
	];

	await form.nativeInput.type('test');
	await expect(form.nativeLogs).toHaveText(logs2);
	await expect(form.baseLogs).toHaveText(logs2);

	const logs3 = [
		createLog('focus', 1),
		createLog('focus', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('blur', 1),
		createLog('blur', 3),
	];

	await page.click('body');
	await expect(form.nativeLogs).toHaveText(logs3);
	await expect(form.baseLogs).toHaveText(logs3);
});

test('works with keyboard events', async ({ page }) => {
	const form = await getForm(page);

	// Change event will be emitted first before the focus event
	// if we type without focus on webkit (headless mode only)
	// This might be a bug from playwright
	await form.nativeInput.focus();

	// Type 'abc'
	await form.nativeInput.type('abc');

	const logs1 = [
		createLog('focus', 1),
		createLog('focus', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
	];

	// Highlight 'c'
	await form.nativeInput.press('Shift+ArrowLeft');
	await expect(form.nativeLogs).toHaveText(logs1);
	await expect(form.baseLogs).toHaveText(logs1);

	const logs2 = [
		createLog('focus', 1),
		createLog('focus', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
	];

	// Cut out 'c'
	await cut(form.nativeInput);
	await expect(form.nativeLogs).toHaveText(logs2);
	await expect(form.baseLogs).toHaveText(logs2);

	const logs3 = [
		createLog('focus', 1),
		createLog('focus', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
	];

	// Paste the 'c' back
	await paste(form.nativeInput);
	await expect(form.nativeLogs).toHaveText(logs3);
	await expect(form.baseLogs).toHaveText(logs3);

	const logs4 = [
		createLog('focus', 1),
		createLog('focus', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
	];

	await selectAll(form.nativeInput);
	await expect(form.nativeLogs).toHaveText(logs4);
	await expect(form.baseLogs).toHaveText(logs4);

	const logs5 = [
		createLog('focus', 1),
		createLog('focus', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
	];

	// Delete all text
	await form.nativeInput.press('Backspace');
	await expect(form.nativeLogs).toHaveText(logs5);
	await expect(form.baseLogs).toHaveText(logs5);
});

test('works with reset event', async ({ page }) => {
	const form = await getForm(page, { defaultValue: 'abc' });
	const logs = [
		createLog('focus', 1),
		createLog('focus', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('blur', 1),
		createLog('blur', 3),
	];

	await form.reset.click();
	await expect(form.nativeInput).toHaveValue('abc');
	await expect(form.nativeLogs).toHaveText([]);
	await expect(form.baseLogs).toHaveText([]);

	await form.nativeInput.focus();
	await form.nativeInput.type('d');
	await form.reset.click();
	await expect(form.nativeInput).toHaveValue('abc');
	await expect(form.nativeLogs).toHaveText(logs);
	await expect(form.baseLogs).toHaveText(logs);
});

test('works with focus event', async ({ page }) => {
	const form = await getForm(page, { delegateFocus: true });

	await form.baseInput.focus();
	await expect(form.nativeInput).toBeFocused();
});

/**
 * Some custom inputs might provide additionl control based on native input
 * For example, a custom number input with a custom step control will emit native events
 * only when user types in the input, but not when the step control is clicked
 *
 * In this case, we will likely want the event to be emulated when no native event is actually emitted
 */
test('no recursion', async ({ page }) => {
	const form = await getForm(page);
	const logs = [
		createLog('focus', 1),
		createLog('focus', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('input', 3),
		createLog('change', 3),
		createLog('blur', 1),
		createLog('blur', 3),
	];

	await form.baseInput.focus();
	await form.baseInput.type('abc');
	await page.click('body');

	await expect(form.baseLogs).toHaveText(logs);
});
