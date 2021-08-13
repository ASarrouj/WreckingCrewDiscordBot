import { customsearch_v1, google } from 'googleapis';
let cse = google.customsearch('v1').cse;

export class ImageSearcher {
	cseId: string;
	apiKey: string;
	constructor(cseId: string, apiKey: string){
		this.cseId = cseId;
        this.apiKey = apiKey;
	}

	async search(queryOptions: customsearch_v1.Params$Resource$Cse$List) {
		queryOptions.key = this.apiKey;
		queryOptions.cx = this.cseId;
		return cse.list(queryOptions);
	}
}