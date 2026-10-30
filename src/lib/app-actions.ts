/** Provider-neutral WebMCP registration for real application handlers.
 * Use the same parse/execute pair from the form's submit handler. Server-side
 * authorization and validation remain mandatory; this helper adds no API route. */
export interface AppAction<Input> {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	parse(input: unknown): Input;
	execute(input: Input, signal: AbortSignal): unknown | Promise<unknown>;
}

interface RegistrationContext {
	registerTool(
		tool: {
			name: string;
			description: string;
			inputSchema: Record<string, unknown>;
			execute(input: unknown): Promise<unknown>;
		},
		options: { signal: AbortSignal },
	): void | Promise<void>;
}

export function assertAppActionContract<Input>(action: AppAction<Input>): void {
	const schema = action.inputSchema;
	const properties = schema?.properties;
	const required = schema?.required;
	if (
		!/^[_a-zA-Z][\w-]{0,63}$/.test(action.name) ||
		!action.description?.trim() ||
		action.description.length > 1000 ||
		typeof action.parse !== 'function' ||
		typeof action.execute !== 'function' ||
		schema?.type !== 'object' ||
		schema.additionalProperties !== false ||
		!properties ||
		typeof properties !== 'object' ||
		Array.isArray(properties) ||
		Object.keys(properties).length > 24 ||
		!Array.isArray(required) ||
		new Set(required).size !== required.length ||
		required.some(
			(key) => typeof key !== 'string' || !Object.hasOwn(properties, key),
		) ||
		Object.values(properties).some(
			(field) =>
				!field ||
				typeof field !== 'object' ||
				typeof field.title !== 'string' ||
				!field.title.trim(),
		)
	)
		throw new Error(
			'Invalid app action contract: use a named action, titled object fields, explicit required keys, additionalProperties:false and shared parse/execute handlers',
		);
}

/** React: return registration.dispose from useEffect. Pass current handler
 * dependencies to the effect so registrations track the actual visible UI. */
export function registerAppAction<Input>(
	action: AppAction<Input>,
	options: {
		signal?: AbortSignal;
		onRegistrationError?: (error: unknown) => void;
	} = {},
): { ready: Promise<boolean>; dispose: () => void } {
	const controller = new AbortController();
	const dispose = () => {
		controller.abort();
		options.signal?.removeEventListener('abort', dispose);
	};
	if (options.signal?.aborted) dispose();
	else options.signal?.addEventListener('abort', dispose, { once: true });
	const ready = (async () => {
		try {
			assertAppActionContract(action);
			if (controller.signal.aborted || typeof document === 'undefined')
				return false;
			const context =
				(document as Document & { modelContext?: RegistrationContext })
					.modelContext ||
				(typeof navigator === 'undefined'
					? undefined
					: (navigator as Navigator & { modelContext?: RegistrationContext })
							.modelContext);
			if (typeof context?.registerTool !== 'function') return false;
			await context.registerTool(
				{
					name: action.name,
					description: action.description,
					inputSchema: action.inputSchema,
					async execute(input) {
						controller.signal.throwIfAborted();
						const parsed = action.parse(input);
						controller.signal.throwIfAborted();
						return (
							(await action.execute(parsed, controller.signal)) ?? {
								content: [],
							}
						);
					},
				},
				{ signal: controller.signal },
			);
			return !controller.signal.aborted;
		} catch (error) {
			dispose();
			// A missing/denied/duplicate registration must never break normal UI.
			try {
				options.onRegistrationError?.(error);
			} catch {
				/* observer only */
			}
			return false;
		}
	})();
	return { ready, dispose };
}
