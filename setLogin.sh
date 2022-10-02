if [ ! -f "src/secureConstants.ign.ts" ]; then
	touch src/secureConstants.ign.ts
	echo "Input discord bot login token: "
	read token
	echo "export const googleApiCreds = [{cx: '',apiKey: ''}]; export const loginToken = '${token}'; export const twitterApiCreds = {key: '',secret: '',bearer: '',accAccessToken: '',accAccessSecret: '',id: ''};" > src/secureConstants.ign.ts
fi