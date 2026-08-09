export namespace db {
	
	export class ClipboardItem {
	    id: number;
	    type: string;
	    content: string;
	    source_app: string;
	    created_at: string;
	    pinned: boolean;
	    tags: string[];
	
	    static createFrom(source: any = {}) {
	        return new ClipboardItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.content = source["content"];
	        this.source_app = source["source_app"];
	        this.created_at = source["created_at"];
	        this.pinned = source["pinned"];
	        this.tags = source["tags"];
	    }
	}

}

export namespace settings {
	
	export class AppSettings {
	    retention_days: number;
	    max_item_size_mb: number;
	    keybinding: string;
	    is_dual_tone: boolean;
	    theme_color: string;
	    border_radius: number;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.retention_days = source["retention_days"];
	        this.max_item_size_mb = source["max_item_size_mb"];
	        this.keybinding = source["keybinding"];
	        this.is_dual_tone = source["is_dual_tone"];
	        this.theme_color = source["theme_color"];
	        this.border_radius = source["border_radius"];
	    }
	}

}

