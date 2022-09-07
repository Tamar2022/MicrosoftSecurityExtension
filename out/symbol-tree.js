"use strict";
// import { commands, Disposable, EventEmitter, TreeDataProvider, window } from "vscode";
// import { SymbolTreeInput } from "./references-view";
Object.defineProperty(exports, "__esModule", { value: true });
const customer_gate_1 = require("./customGate/customer-gate");
// export class SymbolsTree {
// 	readonly viewId = 'references-view.tree';
// 	private readonly _ctxIsActive = new ContextKey<boolean>('reference-list.isActive');
// 	private readonly _ctxHasResult = new ContextKey<boolean>('reference-list.hasResult');
// 	private readonly _ctxInputSource = new ContextKey<string>('reference-list.source');
// 	private readonly _history = new TreeInputHistory(this);
// 	private readonly _provider = new TreeDataProviderDelegate();
// 	private readonly _dnd = new TreeDndDelegate();
// 	private readonly _tree: vscode.TreeView<unknown>;
// 	private readonly _navigation: Navigation;
// 	private _input?: SymbolTreeInput<unknown>;
// 	private _sessionDisposable?: Disposable;
// 	constructor() {
// 		this._tree = window.createTreeView<unknown>(this.viewId, {
// 			treeDataProvider: this._provider,
// 			showCollapseAll: true,
// 			dragAndDropController: this._dnd
// 		});
// 		this._navigation = new Navigation(this._tree);
// 	}
// 	dispose(): void {
// 		this._history.dispose();
// 		this._tree.dispose();
// 		this._sessionDisposable?.dispose();
// 	}
// 	getInput(): SymbolTreeInput<unknown> | undefined {
// 		return this._input;
// 	}
// 	async setInput(input: SymbolTreeInput<unknown>) {
// 		if (!await isValidRequestPosition(input.location.uri, input.location.range.start)) {
// 			this.clearInput();
// 			return;
// 		}
// 		this._ctxInputSource.set(input.contextValue);
// 		this._ctxIsActive.set(true);
// 		this._ctxHasResult.set(true);
// 		commands.executeCommand(`${this.viewId}.focus`);
// 		const newInputKind = !this._input || Object.getPrototypeOf(this._input) !== Object.getPrototypeOf(input);
// 		this._input = input;
// 		this._sessionDisposable?.dispose();
// 		this._tree.title = input.title;
// 		this._tree.message = newInputKind ? undefined : this._tree.message;
// 		const modelPromise = Promise.resolve(input.resolve());
// 		// set promise to tree data provider to trigger tree loading UI
// 		this._provider.update(modelPromise.then(model => model?.provider ?? this._history));
// 		this._dnd.update(modelPromise.then(model => model?.dnd));
// 		const model = await modelPromise;
// 		if (this._input !== input) {
// 			return;
// 		}
// 		if (!model) {
// 			this.clearInput();
// 			return;
// 		}
// 		this._history.add(input);
// 		this._tree.message = model.message;
// 		// navigation
// 		this._navigation.update(model.navigation);
// 		// reveal & select
// 		const selection = model.navigation?.nearest(input.location.uri, input.location.range.start);
// 		if (selection && this._tree.visible) {
// 			await this._tree.reveal(selection, { select: true, focus: true, expand: true });
// 		}
// 		const disposables: Disposable[] = [];
// 		// editor highlights
// 		let highlights: EditorHighlights<unknown> | undefined;
// 		if (model.highlights) {
// 			highlights = new EditorHighlights(this._tree, model.highlights);
// 			disposables.push(highlights);
// 		}
// 		// listener
// 		if (model.provider.onDidChangeTreeData) {
// 			disposables.push(model.provider.onDidChangeTreeData(() => {
// 				this._tree.title = input.title;
// 				this._tree.message = model.message;
// 				highlights?.update();
// 			}));
// 		}
// 		if (typeof model.dispose === 'function') {
// 			disposables.push(new Disposable(() => model.dispose!()));
// 		}
// 		this._sessionDisposable = Disposable.from(...disposables);
// 	}
// 	clearInput(): void {
// 		this._sessionDisposable?.dispose();
// 		this._input = undefined;
// 		this._ctxHasResult.set(false);
// 		this._ctxInputSource.reset();
// 		this._tree.title = localize('title', 'References');
// 		this._tree.message = this._history.size === 0
// 			? localize('noresult', 'No results.')
// 			: localize('noresult2', 'No results. Try running a previous search again:');
// 		this._provider.update(Promise.resolve(this._history));
// 	}
// }
// // --- tree data
// interface ActiveTreeDataProviderWrapper {
// 	provider: Promise<TreeDataProvider<any>>;
// }
// class TreeDataProviderDelegate implements TreeDataProvider<undefined> {
// 	provider?: Promise<TreeDataProvider<any>>;
// 	private _sessionDispoables?: Disposable;
// 	private _onDidChange = new EventEmitter<any>();
// 	readonly onDidChangeTreeData = this._onDidChange.event;
// 	update(provider: Promise<TreeDataProvider<any>>) {
// 		this._sessionDispoables?.dispose();
// 		this._sessionDispoables = undefined;
// 		this._onDidChange.fire(undefined);
// 		this.provider = provider;
// 		provider.then(value => {
// 			if (this.provider === provider && value.onDidChangeTreeData) {
// 				this._sessionDispoables = value.onDidChangeTreeData(this._onDidChange.fire, this._onDidChange);
// 			}
// 		}).catch(err => {
// 			this.provider = undefined;
// 			console.error(err);
// 		});
// 	}
// 	async getTreeItem(element: unknown) {
// 		this._assertProvider();
// 		return (await this.provider).getTreeItem(element);
// 	}
// 	async getChildren(parent?: unknown | undefined) {
// 		this._assertProvider();
// 		return (await this.provider).getChildren(parent);
// 	}
// 	async getParent(element: unknown) {
// 		this._assertProvider();
// 		const provider = await this.provider;
// 		return provider.getParent ? provider.getParent(element) : undefined;
// 	}
// 	private _assertProvider(): asserts this is ActiveTreeDataProviderWrapper {
// 		if (!this.provider) {
// 			throw new Error('MISSING provider');
// 		}
// 	}
// }
customer_gate_1.CustomGate;
//# sourceMappingURL=symbol-tree.js.map