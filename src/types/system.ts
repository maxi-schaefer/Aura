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

/** A matching line inside a file, from `search_file_contents`. */
export interface ContentMatch {
    name: string;
    path: string;
    /** 1-based line number. */
    line: number;
    preview: string;
    /** Total matching lines in the file, which may exceed those returned. */
    total_in_file: number;
}
