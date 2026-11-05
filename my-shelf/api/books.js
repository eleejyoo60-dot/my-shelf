// 노션 속성 이름 (데이터베이스와 다르면 여기만 수정하세요)
const PROP = {
  author: "저자",
  pages: "페이지수",
  color: "색상",
  height: "높이",
  spine: "책등이미지",
  status: "상태",
  date: "읽은 기간", // 다 읽은 날짜 (날짜 유형)
};

// 책장에 보여줄 상태 값. 비워 두면 전부 표시. 예: ["읽는 중", "완독"]
const SHOW_STATUS = [];

// 책장에서 뺄 제목. 예: ["독서노트_기본", "제호"]
const EXCLUDE_TITLES = ["독서노트_기본"];

const getText = (v) =>
  v?.rich_text?.map((t) => t.plain_text).join("") || v?.select?.name || "";

const getSpine = (v) => {
  const f = v?.files?.[0];
  return f?.file?.url ?? f?.external?.url ?? v?.url ?? "";
};

export default async function handler(req, res) {
  try {
    let results = [];
    let cursor;
    do {
      const r = await fetch(
        `https://api.notion.com/v1/data_sources/${process.env.NOTION_DB_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
            "Notion-Version": "2025-09-03",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
        }
      );
      const data = await r.json();
      if (!data.results) {
        return res.status(500).json(data);
      }
      results = results.concat(data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    let books = results
      .map((p) => {
        const pr = p.properties;
        const titleProp = Object.values(pr).find((v) => v.type === "title");
        const status = pr[PROP.status]?.status?.name ?? pr[PROP.status]?.select?.name ?? "";
        const d = pr[PROP.date]?.date;
        return {
          title: titleProp?.title?.map((t) => t.plain_text).join("") ?? "",
          author: getText(pr[PROP.author]),
          pages: pr[PROP.pages]?.number ?? 250,
          color: getText(pr[PROP.color]) || "#888",
          height: pr[PROP.height]?.number ?? 190,
          spine: getSpine(pr[PROP.spine]),
          status,
          date: (d?.end ?? d?.start ?? "").slice(0, 10),
          url: p.url,
        };
      })
      .filter((b) => !EXCLUDE_TITLES.includes(b.title))
      .filter((b) => SHOW_STATUS.length === 0 || SHOW_STATUS.includes(b.status));

    // 주소 뒤에 ?range=month (최근 30일) 또는 ?range=thismonth (이번 달)
    const range = req.query?.range;
    if (range === "month") {
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      books = books.filter((b) => b.date && b.date >= cutoff);
    } else if (range === "thismonth") {
      const ym = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
      books = books.filter((b) => b.date.startsWith(ym));
    }
    if (range) {
      books.sort((a, b) => a.date.localeCompare(b.date));
    }

    res.setHeader("Cache-Control", "s-maxage=60");
    res.status(200).json(books);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
