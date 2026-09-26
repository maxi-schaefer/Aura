/** An installed application, as returned by `get_installed_apps`. */
export interface AppItem {
    name: string;
    path: string;
    icon?: string | null;
}

/** A file or directory hit, as returned by `search_files`. */
export interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
    icon?: string | null;
}

/** A recently opened VS Code folder or workspace, from `get_vscode_projects`. */
export interface VsCodeProject {
    name: string;
    path: string;
    is_workspace: boolean;
    /** Seconds since the epoch. */
    last_opened: number;
    /** Display name of the editor variant, e.g. "VS Code". */
    editor: string;
}
