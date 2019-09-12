# gmail_connector
Connnect to gmail to check for specific message

Build query filter with fluent API.


```javascript
const gmail = require('./gmai-api');

const query = gmail.queryBuilder
    .new()
    .from('nachricht.stage@bitkasten.de')
    .read(true)
    .withSubject('Eine Sendung aus Ihrem [:::(bit)kasten] ist eingetroffen')
    .withAttachment()
    .withFile('DBENW-20190910-dEAim.pds')
    .newerThan('1d');
```

Test like that:
```javascript
(async () => {
    try {
        const exists = await gmail.api.messageExists(query.build());
        console.log(exists);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();
```
