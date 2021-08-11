const commands = [];

const charGroups = {
	n: '[nN\u00D1\u00F1\u0143-\u0149\u019D\u019E\u01F8\u01F9\u0220\u0235\u039D]',
	i: '[iI1!\u00CC-\u00CF\u00EC-\u00EF\u0128-\u0131\u0196\u0197\u01CF\u01D0\u0208-\u020B\u038A\u0390\u0399\u03AA\u03AF\u03B9\u03CA\u0456\u0457]',
	e: '[eE3\u00C8-\u00CB\u00E8-\u00EB\u0112-\u011B\u0204-\u0207\u0228\u0229\u0246\u0247\u0338\u0395\u03AD\u03B5\u0435\u0450\u0451\u04D6-\u04DB\u018E-\u0190\u04BC-\u04BF\u01DD]',
	g: '[gG6\u011C-\u0123\u0193\u01E4-\u01E7\u01F4\u01F5]',
	r: '[rR\u0072\u0154-\u0159\u0210-\u0213\u024C\u024D\u027C]',
	o: '[oO0\u00D2-\u00D8\u00F2-\u00F8\u014C-\u0151\u01A0\u01D1\u01D2\u01EA-\u01ED\u01FE\u01FF\u020C-\u020F\u022A-\u0231\u038C\u0395\u03BF\u03CC\u041E\u043E]',
	a: '[aA\u00C0-\u00C5\u00E0-\u00E5\u0100-\u0105\u01CD\u01CE\u01DE-\u01E1\u01FA\u01FB\u0200-\u0203\u0226\u0227\u023A\u0391\u03AC\u03B1\u0410\u0430\u04D0-\u04D3]',
	f: '[fF\u0191\u0192\u1E1E\u1E1F]',
	t: '[tT\u0162-\u0167\u01AB-\u01AE\u021A\u021B\u0236\u023E\u1E6A\u1E6B\u03A4\u03C4\u0422\u0442\u04AC\u04AD]',
};

const badWordRegexes = [
	new RegExp(`${charGroups.n}+[^a-zA-Z]*(${charGroups.i}|\\*)+[^a-zA-Z]*((${charGroups.g}+|q|\\*)[^a-zA-Z]*){2,}(${charGroups.e}|\\*)+[^a-zA-Z]*${charGroups.r}+`),
	new RegExp(`(?<![a-zA-Z])${charGroups.n}+[^a-zA-Z]*${charGroups.i}+[^a-zA-Z]*${charGroups.g}+(?![a-zA-Z])`),
	new RegExp(`${charGroups.f}+[^a-zA-Z]*(${charGroups.a}|\\*)+[^a-zA-Z]*((${charGroups.g}+|q|\\*)[^a-zA-Z]*)+(${charGroups.o}|\\*)+[^a-zA-Z]*${charGroups.t}+`),
	new RegExp(`(?<![a-zA-Z])${charGroups.f}+[^a-zA-Z]*${charGroups.a}+[^a-zA-Z]*${charGroups.g}+(?![a-zA-Z])`),
];

module.exports = {
	commands,
	/**
	 *
	 * @param {import('discord.js').Message} msg
	 */
	func: async (msg) => {
		badWordRegexes.forEach(regex => {
			if (regex.test(msg.content)) {
				msg.delete();
				//msg.guild.roles.cache.get(adminRoleID)
			}
		});
	}
};