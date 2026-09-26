module.exports = {
    default: function (context) {
        return {
            plugin: function (markdownIt, _pluginOptions) {
            },
            assets: function () {
                return [
                    {name: 'webview.js'},
                    {name: 'webview.css'}
                ];
            },
        };
    },
};