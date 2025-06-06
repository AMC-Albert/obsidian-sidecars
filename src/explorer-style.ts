import type SidecarPlugin from "./main";

export function updateSidecarFileAppearance(plugin: SidecarPlugin) {
	if (plugin.sidecarAppearanceObserver) {
		plugin.sidecarAppearanceObserver.disconnect();
		plugin.sidecarAppearanceObserver = undefined;
	}

	// Add debounce timeout variable (browser safe)
	let styleUpdateTimeout: number | null = null;

	const processNavItem = (el: HTMLElement) => {
		const dataPath = el.getAttribute("data-path");
		if (!dataPath) return;

		const fullSidecarExtension =
			"." + plugin.settings.sidecarSuffix + ".md";
		const isSidecar = dataPath.endsWith(fullSidecarExtension);
		const innerContentEl = el.querySelector(".tree-item-inner");

		// Remove any existing extension tags inside nav-file-title
		Array.from(el.querySelectorAll('.main-ext-tag, .sidecar-tag, .redirect-tag')).forEach((tag) => tag.remove());

		// Remove prepend-dot class from all tags first (in case of toggle)
		Array.from(el.querySelectorAll('.nav-file-tag')).forEach((tag) => tag.classList.remove('sidecar-prepend-dot'));
		// If enabled, add to ALL nav-file-tag elements (not just sidecar/redirect/main-ext)
		if (plugin.settings.prependPeriodToExtTags) {
			Array.from(el.querySelectorAll('.nav-file-tag')).forEach((tag) => tag.classList.add('sidecar-prepend-dot'));
		}
		if (isSidecar) {
			// 1. Set draggable attribute based on settings
			if (plugin.settings.preventDraggingSidecars) {
				el.setAttribute("draggable", "false");
			} else {
				el.removeAttribute("draggable");
			} // 2. Modify display name and add/update tags
			if (innerContentEl) {
				// Always clear existing content to ensure proper re-rendering
				innerContentEl.textContent = "";
				// Only append base name if not hiding it
				if (!plugin.settings.hideSidecarBaseNameInExplorer) {
					// Build display: add baseName only (no tags inside)
					const sourceFilePath = dataPath.slice(
						0,
						-fullSidecarExtension.length
					);
					const sourceFileName = sourceFilePath.substring(
						sourceFilePath.lastIndexOf("/") + 1
					);
					const dotIndex = sourceFileName.lastIndexOf(".");
					const baseName =
						dotIndex !== -1
							? sourceFileName.slice(0, dotIndex)
							: sourceFileName;
					// Append base name as text
					innerContentEl.appendChild(document.createTextNode(baseName));
				}
			}

			// Add redirect decorator to sidecar if enabled and main file has redirect
			if (plugin.settings.showRedirectDecoratorOnSidecars && plugin.sidecarMainFileHasRedirect(dataPath)) {
				const titleEl = el.querySelector('.tree-item-inner');
				if (titleEl) {
					// Remove any existing redirect decorator
					const existingDecorator = el.querySelector('.redirect-decorator');
					if (existingDecorator) {
						existingDecorator.remove();
					}					// Add the redirect decorator icon at the beginning
					const decoratorEl = document.createElement('span');
					decoratorEl.className = 'redirect-decorator';
					// Apply dimming if sidecar dimming is enabled
					if (plugin.settings.dimSidecarsInExplorer) {
						decoratorEl.classList.add('dimmed');
					}
					// Apply accent color if sidecar coloring is enabled
					if (plugin.settings.colorSidecarExtension) {
						decoratorEl.classList.add('accent-colored');
					}
					decoratorEl.title = 'Main file has a redirect file';
					
					// Insert the decorator before the existing content
					titleEl.insertBefore(decoratorEl, titleEl.firstChild);
				}
			} else {
				// Remove redirect decorator if setting is disabled or redirect file is gone
				const existingDecorator = el.querySelector('.redirect-decorator');
				if (existingDecorator) {
					existingDecorator.remove();
				}
			}

			// If hideMainExtensionInExplorer is false and we have a main extension, show it as a tag (as child)
			if (!plugin.settings.hideMainExtensionInExplorer && innerContentEl) {
				const sourceFilePath = dataPath.slice(0, -fullSidecarExtension.length);
				const sourceFileName = sourceFilePath.substring(sourceFilePath.lastIndexOf("/") + 1);
				const dotIndex = sourceFileName.lastIndexOf(".");
				const mainExt = dotIndex !== -1 ? sourceFileName.slice(dotIndex + 1) : "";
				if (mainExt) {
					const mainExtTag = document.createElement("div");
					mainExtTag.className = "nav-file-tag main-ext-tag";
					mainExtTag.textContent = mainExt.toUpperCase();
					if (plugin.settings.prependPeriodToExtTags) mainExtTag.classList.add('sidecar-prepend-dot');
					el.appendChild(mainExtTag);
				}
			}

			// Append sidecar suffix tag as child
			const sidecarTagEl = document.createElement("div");
			let classList = "nav-file-tag sidecar-tag";
			if (plugin.settings.dimSidecarsInExplorer)
				classList += " dimmed";
			if (plugin.settings.colorSidecarExtension === false)
				classList += " no-color";
			if (plugin.settings.prependPeriodToExtTags) classList += " sidecar-prepend-dot";
			sidecarTagEl.className = classList;
			sidecarTagEl.textContent = plugin.settings.sidecarSuffix + (plugin.settings.showMdInSidecarTag ? ".md" : "");
			el.appendChild(sidecarTagEl);

			// Reset draggable status if we set it
			if (el.getAttribute("draggable") === "false") {
				el.removeAttribute("draggable");
			}
		}		// --- Handle redirect files ---
		// Note: We style redirect files based on their filename pattern regardless of whether
		// redirect file management is enabled. The management setting only controls creation.
		const fullRedirectExtension = plugin.settings.redirectFileSuffix ? 
			'.' + plugin.settings.redirectFileSuffix + '.md' : '.redirect.md';
		const isRedirect = dataPath.endsWith(fullRedirectExtension);
		if (isRedirect) {
			if (plugin.settings.preventDraggingSidecars) {
				el.setAttribute("draggable", "false");
			} else {
				el.removeAttribute("draggable");
			}
			if (innerContentEl) {
				innerContentEl.textContent = "";
				// Only append base name if not hiding it
				if (!plugin.settings.hideSidecarBaseNameInExplorer) {
					// Show the base name (without .redirect.md)
					const sourceFilePath = dataPath.slice(0, -fullRedirectExtension.length);
					const sourceFileName = sourceFilePath.substring(sourceFilePath.lastIndexOf("/") + 1);
					const dotIndex = sourceFileName.lastIndexOf(".");
					const baseName = dotIndex !== -1 ? sourceFileName.slice(0, dotIndex) : sourceFileName;
					innerContentEl.appendChild(document.createTextNode(baseName));
				}
			}
			// If hideMainExtensionInExplorer is false and we have a main extension, show it as a tag (as child)
			if (!plugin.settings.hideMainExtensionInExplorer && innerContentEl) {
				const sourceFilePath = dataPath.slice(0, -fullRedirectExtension.length);
				const sourceFileName = sourceFilePath.substring(sourceFilePath.lastIndexOf("/") + 1);
				const dotIndex = sourceFileName.lastIndexOf(".");
				const mainExt = dotIndex !== -1 ? sourceFileName.slice(dotIndex + 1) : "";
				if (mainExt) {
					const mainExtTag = document.createElement("div");
					mainExtTag.className = "nav-file-tag main-ext-tag";
					mainExtTag.textContent = mainExt.toUpperCase();
					if (plugin.settings.prependPeriodToExtTags) mainExtTag.classList.add('sidecar-prepend-dot');
					el.appendChild(mainExtTag);
				}
			}
			// Append redirect suffix tag as child
			const redirectTagEl = document.createElement("div");
			let classList = "nav-file-tag redirect-tag";
			if (plugin.settings.dimSidecarsInExplorer)
				classList += " dimmed";
			if (plugin.settings.colorSidecarExtension === false)
				classList += " no-color";
			if (plugin.settings.prependPeriodToExtTags) classList += " sidecar-prepend-dot";
			redirectTagEl.className = classList;
			redirectTagEl.textContent = plugin.settings.redirectFileSuffix + (plugin.settings.showMdInSidecarTag ? ".md" : "");
			el.appendChild(redirectTagEl);
			if (el.getAttribute("draggable") === "false") {
				el.removeAttribute("draggable");
			}
		}

		// --- Handle regular files with redirect decorators ---
		// Only process files that are not sidecar or redirect files
		if (!isSidecar && !isRedirect && plugin.settings.showRedirectDecorator) {
			// Check if this file has a redirect file
			if (plugin.hasRedirectFile(dataPath)) {
				// Add redirect decorator icon
				const titleEl = el.querySelector('.tree-item-inner');
				if (titleEl) {
					// Remove any existing redirect decorator
					const existingDecorator = el.querySelector('.redirect-decorator');
					if (existingDecorator) {
						existingDecorator.remove();
					}					// Add the redirect decorator icon at the beginning
					const decoratorEl = document.createElement('span');
					decoratorEl.className = 'redirect-decorator';
					decoratorEl.title = 'This file has a redirect file';
					
					// Insert the decorator before the existing content
					titleEl.insertBefore(decoratorEl, titleEl.firstChild);
				}
			} else {
				// Remove redirect decorator if it exists but redirect file is gone
				const existingDecorator = el.querySelector('.redirect-decorator');
				if (existingDecorator) {
					existingDecorator.remove();
				}
			}
		}
	};
	plugin.sidecarAppearanceObserver = new MutationObserver((mutations) => {
		// Flag to track if we need to process attribute changes
		let shouldProcessAttributes = false;
		let dataPathChanged = false;
		let isDragging = false;

		// Track added nodes directly
		const affectedNodes: Set<HTMLElement> = new Set();

		// First check if we're in a drag operation to avoid unnecessary processing
		isDragging = document.querySelector(".is-being-dragged-over") !== null;

		mutations.forEach((mutation) => {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach((node) => {
					if (
						node instanceof HTMLElement &&
						node.classList.contains("nav-file-title")
					) {
						affectedNodes.add(node);
						shouldProcessAttributes = true;
					}
				});
			} else if (mutation.type === "attributes" && !isDragging) {
				// Skip attribute processing entirely during drag operations
				if (mutation.target instanceof HTMLElement) {
					// Check for drag operation related classes
					if (
						mutation.target.classList.contains(
							"is-being-dragged-over"
						) ||
						(mutation.oldValue &&
							mutation.oldValue.includes("is-being-dragged-over"))
					) {
						return; // Skip this specific mutation
					}

					// Track if data-path changed (file moved)
					if (mutation.attributeName === "data-path") {
						dataPathChanged = true;
						shouldProcessAttributes = true;
						if (
							mutation.target.classList.contains("nav-file-title")
						) {
							affectedNodes.add(mutation.target);
						}
					}

					// Track class changes for folder expansion/collapse
					if (
						mutation.attributeName === "class" &&
						(mutation.target.classList.contains("is-collapsed") ||
							(mutation.oldValue &&
								mutation.oldValue.includes("is-collapsed")))
					) {
						shouldProcessAttributes = true;
					}
				}
			}
		});

		// Only schedule the update if needed and not during drag operations
		if (shouldProcessAttributes && !isDragging) {
			if (styleUpdateTimeout !== null) {
				window.clearTimeout(styleUpdateTimeout);
			}

			// Use a brief timeout to debounce multiple rapid mutations and allow DOM to settle
			styleUpdateTimeout = window.setTimeout(() => {
				// First, process any directly affected nodes
				if (affectedNodes.size > 0) {
					affectedNodes.forEach((node) => processNavItem(node));
				}				// If we had data-path changes, refresh relevant files
				// This ensures that moved files are properly styled
				if (dataPathChanged) {
					const query = '.nav-file-title[data-path$=".' + plugin.settings.sidecarSuffix + '.md"], ' +
						'.nav-file-title[data-path$=".' + plugin.settings.redirectFileSuffix + '.md"]';
					document.querySelectorAll(query)
						.forEach((el) => {
							if (el instanceof HTMLElement) processNavItem(el);
						});
					
					// Also refresh all regular files to update redirect decorators
					if (plugin.settings.showRedirectDecorator) {
						document.querySelectorAll('.nav-file-title')
							.forEach((el) => {
								if (el instanceof HTMLElement) {
									const dataPath = el.getAttribute("data-path");
									if (dataPath && !plugin.isSidecarFile(dataPath) && !plugin.isRedirectFile(dataPath)) {
										processNavItem(el);
									}
								}
							});
					}

					// Also refresh sidecar files if decorator on sidecars is enabled
					if (plugin.settings.showRedirectDecoratorOnSidecars) {
						document.querySelectorAll('.nav-file-title[data-path$=".' + plugin.settings.sidecarSuffix + '.md"]')
							.forEach((el) => {
								if (el instanceof HTMLElement) processNavItem(el);
							});
					}
				}
				styleUpdateTimeout = null;
			}, 50); // Increased timeout from 20ms to 50ms
		}
	});
	const navContainer = document.querySelector(
		".nav-files-container, .workspace-leaf-content .nav-files-container"
	);
	if (navContainer) {
		plugin.sidecarAppearanceObserver.observe(navContainer, {
			childList: true,
			subtree: true,
			attributes: true, attributeOldValue: true,
			attributeFilter: ["class", "data-path"], // Track both class and data-path changes
		});
	}
	// Always force a refresh of all nav-file-title elements when this function is called
	document.querySelectorAll(".nav-file-title").forEach((el) => {
		if (el instanceof HTMLElement) processNavItem(el);
	});
}

export function updateSidecarCss(plugin: SidecarPlugin) {
	const id = "sidecar-styles";
	let styleElement = document.getElementById(id) as HTMLStyleElement | null;
	let styleTextContent = "";

	const fullSidecarExtension = "." + plugin.settings.sidecarSuffix + ".md";
	const fullRedirectExtension = "." + plugin.settings.redirectFileSuffix + ".md";
	// File visibility styles
	if (plugin.settings.hideSidecarsInExplorer) {
		styleTextContent += `
		.nav-file-title[data-path$='${fullSidecarExtension}'] {
			display: none !important;
		}
		`;
	}
	
	if (plugin.settings.hideRedirectFilesInExplorer) {
		styleTextContent += `
		.nav-file-title[data-path$='${fullRedirectExtension}'] {
			display: none !important;
		}
		`;
	}
	
	if (plugin.settings.dimSidecarsInExplorer) {
		styleTextContent += `
		.nav-file-title[data-path$='${fullSidecarExtension}'],
		.nav-file-title[data-path$='${fullRedirectExtension}'] {
			color: var(--text-faint) !important;
		}
		.nav-file-title[data-path$='${fullSidecarExtension}'] .tree-item-icon,
		.nav-file-title[data-path$='${fullRedirectExtension}'] .tree-item-icon {
			color: var(--text-faint) !important;
		}
		.nav-file-title[data-path$='${fullSidecarExtension}']:hover,
		.nav-file-title[data-path$='${fullSidecarExtension}'].is-active,
		.nav-file-title[data-path$='${fullRedirectExtension}']:hover,
		.nav-file-title[data-path$='${fullRedirectExtension}'].is-active {
			color: var(--text-muted) !important;
		}
		.nav-file-title[data-path$='${fullSidecarExtension}']:hover .tree-item-icon,
		.nav-file-title[data-path$='${fullSidecarExtension}'].is-active .tree-item-icon,
		.nav-file-title[data-path$='${fullRedirectExtension}']:hover .tree-item-icon,
		.nav-file-title[data-path$='${fullRedirectExtension}'].is-active .tree-item-icon {
			color: var(--text-muted) !important;
		}
		`;
	}

	// Arrow indicator styles
	if (plugin.settings.prependSidecarIndicator) {
		styleTextContent += `
		.nav-file-title[data-path$='${fullSidecarExtension}']::before,
		.nav-file-title[data-path$='${fullRedirectExtension}']::before {
			content: "⮡";
			padding-left: 0.2em;
			padding-right: 0.75em;
		}
		.nav-file-title[data-path$='${fullSidecarExtension}'] .tree-item-inner,
		.nav-file-title[data-path$='${fullRedirectExtension}'] .tree-item-inner {
			vertical-align: text-top;
		}
		.nav-file-title[data-path$='${fullSidecarExtension}'],
		.nav-file-title[data-path$='${fullRedirectExtension}'] {
			padding-top: 0px !important;
			padding-bottom: calc(2 * var(--size-4-1)) !important;
		}
		`;
	}	// Hide default .md extensions for sidecar files (dynamic - uses template variables)
	styleTextContent += `
	/* Hide default .md extensions for sidecar files */
	.nav-file-title[data-path$='${fullSidecarExtension}'] .nav-file-tag:not(.sidecar-tag):not(.main-ext-tag):not(.redirect-tag) {
		display: none !important;
	}
	.nav-file-title[data-path$='${fullRedirectExtension}'] .nav-file-tag:not(.sidecar-tag):not(.main-ext-tag):not(.redirect-tag) {
		display: none !important;
	}
	`;

	// Apply or remove styles
	if (styleTextContent) {
		if (!styleElement) {
			styleElement = document.createElement("style");
			styleElement.id = id;
			document.head.appendChild(styleElement);
		}
		styleElement.textContent = styleTextContent;
	} else {
		if (styleElement) styleElement.remove();
	}
}
