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

