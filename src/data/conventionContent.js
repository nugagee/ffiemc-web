import { CONVENTION_BLOG_IDS } from "./aboutDefaults";
import { CHURCH_DOCTRINES, DOCTRINE_PURPOSE } from "./churchDoctrines";

const IMG = "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1200&h=630&fit=crop";
const SEPTEMBER_IMG = "/happy-new-month-september-2025.png";

const doctrineSnapshotList = CHURCH_DOCTRINES.map(
  (d, i) => `<li><strong>${i + 1}. ${d.title}</strong> — ${d.summary}</li>`
).join("\n");

const SEPTEMBER_DOCTRINES_CONTENT = `<p><em>"This is the day the Lord has made; we will rejoice and be glad in it."</em> — Psalm 118:24</p>
<p>Happy New Month, beloved family! 🙏</p>
<p>As we step into <strong>September</strong>, we thank God for His faithfulness through every season. A new month is more than a calendar change — it is a fresh invitation to <strong>return to the foundation</strong> of what we believe, why we gather, and what Fire-Fire International Evangelical Church stands for in Christ.</p>
<p>Whether you worship at Headquarters, an assembly across Ibadan, or a campus fellowship — we are one family united by <strong>sound doctrine</strong> and a passion to <em>teach one by one another</em>.</p>

<h3>Why doctrine matters</h3>
<p>${DOCTRINE_PURPOSE.definition}</p>
<p>We are called to <strong>possess, pursue, practice, proclaim, preserve, and preach</strong> the truth — passing it faithfully to the next generation (Proverbs 30:5–6; Deuteronomy 6:6–7).</p>
<p>Doctrine is not dry religion. It is the <strong>backbone of the believer</strong> — the solid ground beneath every prayer, every service, and every step of faith.</p>

<h3>A snapshot: what we believe</h3>
<p>Below is a brief overview of our <strong>30 foundational doctrines</strong>. Each one is rooted in Scripture and explained in full on our About page.</p>
<ol>
${doctrineSnapshotList}
</ol>

<h3>Go deeper this September</h3>
<p>Reading this list is a start — <strong>studying it is transformation</strong>. On our website you will find:</p>
<ul>
<li><strong>Full doctrine explanations</strong> with supporting Scriptures — expand each teaching and meditate on the Word.</li>
<li><strong>The Catechism</strong> — questions and answers to help you understand and teach the faith clearly.</li>
<li><strong>Church history</strong> — how God raised and has sustained this ministry since 1991.</li>
</ul>
<p>👉 <strong><a href="/about#doctrines">Visit the About page — Church Doctrines</a></strong><br/>
👉 <strong><a href="/about#catechism">Explore the Catechism</a></strong></p>

<h3>A charge for every group</h3>
<p>Pastors, leaders, youth, women, and men — let September be the month we:</p>
<ul>
<li>Read one doctrine together each week in your fellowship group</li>
<li>Memorise the supporting Scriptures</li>
<li>Discuss how each truth applies to daily living</li>
<li>Invite someone new to discover what our church believes</li>
</ul>
<p><em>"All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness."</em> — 2 Timothy 3:16</p>
<p>May this month bring you open doors, divine peace, strength, favour, and a harvest of joy. Happy New Month, family — in Jesus' name! Amen. 🕊️❤️</p>
<p><em>— Fire-Fire International Evangelical Church</em></p>`;

export const CONVENTION_BLOG_POSTS = [
  {
    id: CONVENTION_BLOG_IDS.septemberDoctrines,
    title: "Happy New Month! Know What We Believe — A September Welcome",
    slug: "happy-new-month-know-our-doctrines-september",
    excerpt:
      "Welcome to September! Discover what Fire-Fire stands for — a snapshot of our 30 church doctrines and an invitation to study the full teachings on our About page.",
    category: "Teaching",
    author: "Fire-Fire International Evangelical Church",
    image: SEPTEMBER_IMG,
    featured: true,
    published: true,
    status: "published",
    tags: "september,doctrines,about,teaching,new-month",
    published_at: "2026-09-01T08:00:00.000Z",
    sort_order: -1,
    content: SEPTEMBER_DOCTRINES_CONTENT,
  },
  {
    id: CONVENTION_BLOG_IDS.failure,
    title: "Failure: The Pathway to Success",
    slug: "failure-the-pathway-to-success",
    excerpt:
      "Failure is not the end — it is an event, an experience, and a springboard when we learn, respond rightly, and trust God to raise us again.",
    category: "Education",
    author: "Fire-Fire Youth Ministry",
    image: IMG,
    featured: true,
    published: true,
    status: "published",
    tags: "youth,convention,character",
    content: `<p>The greatest enemy is not failure — it is the fear of trying again. When we stumble, God is still able to lift us, teach us, and turn our setbacks into stepping stones.</p>
<h3>Failure is only an event</h3>
<p>Failure is a passing moment, not your identity. Do not let one event define your future. With God, a fall is not final.</p>
<h3>Failure is an experience</h3>
<p>When failure comes, two things are involved: what you may lose and what you must learn. Choose to gain wisdom from the experience rather than repeat the same mistakes.</p>
<h3>A springboard for success</h3>
<p>Failure can become fuel for a better plan. As Isaiah 9:10 reminds us, though bricks fall, we can build with hewn stones. Close one chapter with faith and open another with greater purpose.</p>
<h3>Failure is never final</h3>
<p><em>"Though he fall, he shall not be utterly cast down: for the LORD upholdeth him with his hand."</em> — Psalm 37:24<br/>
<em>"Rejoice not against me, O mine enemy: when I fall, I shall arise."</em> — Micah 7:8<br/>
The righteous may fall seven times, yet rises again (Proverbs 24:16).</p>
<h3>Respond — don't merely react</h3>
<p>Reacting blames others and quits. Responding seeks God, learns the lesson, and moves forward. Ask: What must I stop? What must I start? How do I overcome this with God's help?</p>
<p>Success is not served on a platter of gold — it is built through perseverance, obedience, and faith in Christ who is our All in All.</p>`,
  },
  {
    id: CONVENTION_BLOG_IDS.timeYouth,
    title: "The Importance of Time to Youth",
    slug: "importance-of-time-to-youth",
    excerpt:
      "Time is a gift from God. Youth is the season to redeem the days, seek salvation, and build a life of wisdom and purpose.",
    category: "Youth",
    author: "Fire-Fire Youth Ministry",
    image: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=1200&h=630&fit=crop",
    featured: false,
    published: true,
    status: "published",
    tags: "youth,time,wisdom",
    content: `<h3>Meaning of time</h3>
<p>Time is God's measure of change and opportunity. <em>"To every thing there is a season, and a time to every purpose under the heaven"</em> (Ecclesiastes 3:1).</p>
<p><em>"Behold, now is the accepted time; behold, now is the day of salvation"</em> (2 Corinthians 6:2). Youth is not for waste — it is for decision, dedication, and destiny.</p>
<p><em>"So teach us to number our days, that we may apply our hearts unto wisdom"</em> (Psalm 90:12). <em>"Redeeming the time, because the days are evil"</em> (Ephesians 5:16).</p>
<h3>Why God gave us time</h3>
<p>Time is an opportunity to know God, serve Him, grow in character, and prepare for eternity. What you do with your youth shapes your tomorrow.</p>
<p>Do not postpone salvation, prayer, study of the Word, or holy living. Use this season to build integrity, vision, and influence that honours Christ.</p>
<p><em>"And let us not be weary in well doing: for in due season we shall reap, if we faint not"</em> (Galatians 6:9).</p>`,
  },
  {
    id: CONVENTION_BLOG_IDS.wayTruthLife,
    title: "The Way, the Truth, and the Life",
    slug: "the-way-truth-and-life",
    excerpt:
      "In perilous times, the world searches for direction, reality, and eternal life. Jesus Christ alone is the Way, the Truth, and the Life.",
    category: "Teaching",
    author: "Fire-Fire International Evangelical Church",
    image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1200&h=630&fit=crop",
    featured: false,
    published: true,
    status: "published",
    tags: "jesus,doctrine,salvation",
    content: `<p>In the last days, men will be lovers of themselves, proud, and formulators of religion without power (2 Timothy 3:1–5). Yet humanity still searches for direction, reality, and something eternal.</p>
<h3>The Way — Direction</h3>
<p>The world offers many roads, but <em>"There is a way which seemeth right unto a man, but the end thereof are the ways of death"</em> (Proverbs 14:12). Jesus said, <em>"I am the way, the truth, and the life: no man cometh unto the Father, but by me"</em> (John 14:6).</p>
<h3>The Truth — Reality</h3>
<p>People are tired of artificial living. Christ is the personification of truth. In every storm, He remains the real answer — the Word made flesh.</p>
<h3>The Life — Eternal</h3>
<p>Worldly pleasures fade. Jesus came that we might have life, and have it more abundantly (John 10:10). Eternal life is found only in Him.</p>
<p>Turn to God today. Open life's instruction manual — the Holy Bible — and let Jesus Christ be your All in All.</p>`,
  },
  {
    id: CONVENTION_BLOG_IDS.allInAll,
    title: "Jesus Christ: All in All",
    slug: "jesus-christ-all-in-all",
    excerpt:
      "He is the Redeemer, Justifier, Provider, Deliverer, and King. At the end of it all, you will discover He is truly All in All.",
    category: "Worship",
    author: "Fire-Fire International Evangelical Church",
    image: "https://images.unsplash.com/photo-1507692049794-de58290ffe11?w=1200&h=630&fit=crop",
    featured: false,
    published: true,
    status: "published",
    tags: "convention,theme,worship",
    content: `<p>Jesus is all you need. He is the All in All.</p>
<ul>
<li>He is the Redeemer.</li>
<li>He is the Justifier.</li>
<li>He is the same yesterday, today, and forever.</li>
<li>He is the Maker and Provider.</li>
<li>He is the Great Deliverer.</li>
<li>He is the King over every situation.</li>
<li>He is the Ancient of Days and Ruler of the universe.</li>
</ul>
<p>He is your everything. He is more than enough. At the end of it all, you will still discover that He is truly the All in All.</p>
<p><em>Theme: Fire-Fire International Evangelical Church Convention 2026 — April 2–6, Olomi, Ibadan.</em></p>`,
  },
  {
    id: CONVENTION_BLOG_IDS.top10,
    title: "Top 10 Things You Did Not Learn in High School or College",
    slug: "top-10-things-not-learned-in-school",
    excerpt:
      "Life lessons from Psalm 23 — provision, satisfaction, renewal, direction, correction, preparation, and completion through the Good Shepherd.",
    category: "Education",
    author: "Fire-Fire Youth Ministry",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=630&fit=crop",
    featured: false,
    published: true,
    status: "published",
    tags: "education,youth,psalm-23",
    content: `<ol>
<li><strong>You will not make fortune instantly.</strong> Life lesson: be worth what you are paid. Trust the Shepherd's perfect provision (Psalm 23:1).</li>
<li><strong>Life is not divided into semesters.</strong> Opportunities are seldom labelled. Trust His perfect satisfaction (Psalm 23:2).</li>
<li><strong>Life is not fair.</strong> Life is hard, but God is good. Trust His perfect renewal (Psalm 23:3a).</li>
<li><strong>Life has winners and losers.</strong> Grades in life matter more than school grades. Trust His perfect direction (Psalm 23:3b).</li>
<li><strong>Be kind to everyone.</strong> Today's classmate may be tomorrow's leader.</li>
<li><strong>Your teacher was not your final boss.</strong> Accountability continues — the Boss is always right.</li>
<li><strong>Television is not reality.</strong> Build your life on truth, not fantasy.</li>
<li><strong>Accomplish something before you feel good.</strong> Trust the Shepherd's perfect correction (Psalm 23:4).</li>
<li><strong>Your parents are not to blame forever.</strong> Take responsibility. Trust His perfect preparation (Psalm 23:5).</li>
<li><strong>Dependability brings greater responsibility.</strong> Rewards go to finishers. Trust His perfect completion (Psalm 23:6).</li>
</ol>`,
  },
  {
    id: CONVENTION_BLOG_IDS.steppingOut,
    title: "Stepping Out Again",
    slug: "stepping-out-again",
    excerpt:
      "The greatest enemy is not failure — it is the fear of trying again. God is the God of second chances.",
    category: "Faith",
    author: "Fire-Fire Youth Ministry",
    image: IMG,
    featured: false,
    published: true,
    status: "published",
    tags: "faith,restoration,obedience",
    content: `<p><em>Luke 5:4–6; Isaiah 43:18–19</em></p>
<p>Healing from past failure begins when we bring our wounded confidence to God. He restores hearts and calls us to obey again — even after disappointment.</p>
<h3>The God of second chances</h3>
<p><em>"Remember ye not the former things, neither consider the things of old. Behold, I will do a new thing…"</em> (Isaiah 43:18–19). Abraham, Moses, Peter — all knew failure, yet God used them again.</p>
<h3>New nets for new harvests</h3>
<p>New seasons require new thinking, discipline, and structures. Launch out again at Christ's word. What failed shall flourish when Jesus is your All in All.</p>`,
  },
];

export const CONVENTION_BIBLE_STUDIES = [
  {
    id: "bs-week-1-sep-2026",
    kind: "bible_study",
    title: "Monday Bible Study — Faith for All Things",
    slug: "monday-bible-study-faith-for-all-things",
    week_of: "2026-09-01",
    excerpt: "A study on receiving and believing God's word — GBA + GBO: receive what God has said and believe it in your heart.",
    content: `<h3>Deep explanation of faith</h3>
<p><em>Hebrews 11:1; Mark 11:22; Romans 12:3; Ephesians 2:8</em></p>
<p>Faith is a precious gift. <strong>GBA</strong> — receive what God has said. <strong>GBO</strong> — hear and believe it in your heart. Faith involves the mind, the heart, and the mouth.</p>
<h3>The power in faith</h3>
<p><em>Mark 9:23; Matthew 17:20–21</em> — Faith overcomes the world and partners with God in His purposes.</p>
<h3>How faith comes</h3>
<p><em>Romans 10:17; Galatians 5:22; 1 Corinthians 12:9</em> — Through the Word, as fruit of the Spirit, and as a gift of the Spirit.</p>`,
    published: true,
  },
];

export const CONVENTION_DAILY_MANNA = [
  {
    id: "dm-sep-01-2026",
    kind: "daily_manna",
    title: "Daily Manna — September 1",
    slug: "daily-manna-september-1-2026",
    study_date: "2026-09-01",
    excerpt: "Jesus is all you need. He is the Redeemer, Provider, and King over every situation.",
    content: `<p><strong>Reading focus:</strong> John 14:6; Colossians 1:15–20</p>
<p>Jesus is all you need. He is the All in All — Redeemer, Justifier, Maker, Provider, Great Deliverer, and King over every situation.</p>
<p><em>Prayer:</em> Lord, let Christ be my Way, Truth, and Life today. Amen.</p>`,
    published: true,
  },
  {
    id: "dm-sep-02-2026",
    kind: "daily_manna",
    title: "Daily Manna — September 2",
    slug: "daily-manna-september-2-2026",
    study_date: "2026-09-02",
    excerpt: "Redeem the time — youth is the season to seek God and walk in wisdom.",
    content: `<p><strong>Reading focus:</strong> Ephesians 5:16; Psalm 90:12</p>
<p>Teach us to number our days, that we may apply our hearts unto wisdom. Redeem the time, for the days are evil.</p>
<p><em>Prayer:</em> Father, help me use this day for Your glory. Amen.</p>`,
    published: true,
  },
];
