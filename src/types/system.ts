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
