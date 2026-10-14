# イベント出欠 (Event RSVP)

React + Hono + TypeScript のイベント作成・出欠回答アプリです。

## セットアップ

```sh
pnpm install
```

## 開発

```sh
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000

## ビルド / 起動

```sh
pnpm build
pnpm start
```

## テスト

```sh
pnpm test
```

## 主な API

- `POST /api/events` イベント作成 `{ title, dateTime, capacity, deadline }`
- `GET /api/events` 一覧
- `GET /api/events/:id` 詳細（集計付き）
- `PATCH /api/events/:id/capacity` 定員増加 `{ capacity }`
- `POST /api/events/:id/responses` 出欠回答 `{ name, status }`（status: 参加/不参加/未定 または attending/not_attending/undecided）
- `GET /api/events/:id/responses` 回答一覧

## 仕様

- 回答は名前のみで行えます（登録・メールアドレス不要）。
- 締め切りまでは同じ名前で何度でも回答し直せます（最後の回答で上書き）。
- 定員に達した場合は「参加」の新規回答を拒否し、定員を増やすことで受け付け可能になります。
- 締め切り後は新規回答・変更を拒否します。