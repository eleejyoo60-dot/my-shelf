export default async function handler(req, res) {
  const r = await fetch(
    `httpsapi.notion.comv1databases${process.env.NOTION_DB_ID}query`,
    {
      method POST,
      headers {
        Authorization `Bearer ${process.env.NOTION_TOKEN}`,
        Notion-Version 2022-06-28,
        Content-Type applicationjson,
      },
      body JSON.stringify({ page_size 100 }),
    }
  );
  const data = await r.json();
  const books = data.results.map((p) = {
    const pr = p.properties;
    return {
      title pr[도서명].title.[0].plain_text  ,
      author pr[저자].rich_text.[0].plain_text  ,
      pages pr[페이지수].number  250,
      color pr[색상].rich_text.[0].plain_text  #888,
      height pr[높이].number  190,
    };
  });
  res.setHeader(Cache-Control, s-maxage=300);
  res.status(200).json(books);
}