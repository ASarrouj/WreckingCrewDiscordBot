import { customsearch_v1, google } from 'googleapis';
import { GaxiosPromise } from 'googleapis/build/src/apis/abusiveexperiencereport';
const cse = google.customsearch('v1').cse;

export class ImageSearcher {
	cseId: string;
	apiKey: string;
	constructor(cseId: string, apiKey: string) {
		this.cseId = cseId;
		this.apiKey = apiKey;
	}

	async search(queryOptions: customsearch_v1.Params$Resource$Cse$List) : GaxiosPromise<customsearch_v1.Schema$Search> {
		queryOptions.key = this.apiKey;
		queryOptions.cx = this.cseId;
		return cse.list(queryOptions);
	}
}