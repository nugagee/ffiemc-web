-- Seed convention blog posts from FIRE FIRE CONVENTION 2026 document
-- Regenerate: python3 scripts/generate_convention_blog_seed.py

insert into public.blog_posts (
  id, title, excerpt, content, author, category, image, featured, published,
  slug, status, published_at, tags, sort_order, created_at, updated_at
) values (
  'f1f1e001-0001-4001-8001-000000000001'::uuid,
  'Failure: The Pathway to Success',
  'Failure is not the end — it is an event, an experience, and a springboard when we learn, respond rightly, and trust God to raise us again.',
  $post0$<p>The greatest enemy is not failure — it is the fear of trying again. When we stumble, God is still able to lift us, teach us, and turn our setbacks into stepping stones.</p>
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
<p>Success is not served on a platter of gold — it is built through perseverance, obedience, and faith in Christ who is our All in All.</p>$post0$,
  'Fire-Fire Youth Ministry',
  'Education',
  'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1200&h=630&fit=crop',
  true,
  true,
  'failure-the-pathway-to-success',
  'published',
  now() - interval '0 days',
  'youth,convention,character',
  0,
  now() - interval '0 days',
  now()
)
on conflict (id) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  author = excluded.author,
  category = excluded.category,
  image = excluded.image,
  featured = excluded.featured,
  published = excluded.published,
  slug = excluded.slug,
  status = excluded.status,
  published_at = excluded.published_at,
  tags = excluded.tags,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.blog_posts (
  id, title, excerpt, content, author, category, image, featured, published,
  slug, status, published_at, tags, sort_order, created_at, updated_at
) values (
  'f1f1e002-0002-4002-8002-000000000002'::uuid,
  'The Importance of Time to Youth',
  'Time is a gift from God. Youth is the season to redeem the days, seek salvation, and build a life of wisdom and purpose.',
  $post1$<h3>Meaning of time</h3>
<p>Time is God's measure of change and opportunity. <em>"To every thing there is a season, and a time to every purpose under the heaven"</em> (Ecclesiastes 3:1).</p>
<p><em>"Behold, now is the accepted time; behold, now is the day of salvation"</em> (2 Corinthians 6:2). Youth is not for waste — it is for decision, dedication, and destiny.</p>
<p><em>"So teach us to number our days, that we may apply our hearts unto wisdom"</em> (Psalm 90:12). <em>"Redeeming the time, because the days are evil"</em> (Ephesians 5:16).</p>
<h3>Why God gave us time</h3>
<p>Time is an opportunity to know God, serve Him, grow in character, and prepare for eternity. What you do with your youth shapes your tomorrow.</p>
<p>Do not postpone salvation, prayer, study of the Word, or holy living. Use this season to build integrity, vision, and influence that honours Christ.</p>
<p><em>"And let us not be weary in well doing: for in due season we shall reap, if we faint not"</em> (Galatians 6:9).</p>$post1$,
  'Fire-Fire Youth Ministry',
  'Youth',
  'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=1200&h=630&fit=crop',
  false,
  true,
  'importance-of-time-to-youth',
  'published',
  now() - interval '1 days',
  'youth,time,wisdom',
  1,
  now() - interval '1 days',
  now()
)
on conflict (id) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  author = excluded.author,
  category = excluded.category,
  image = excluded.image,
  featured = excluded.featured,
  published = excluded.published,
  slug = excluded.slug,
  status = excluded.status,
  published_at = excluded.published_at,
  tags = excluded.tags,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.blog_posts (
  id, title, excerpt, content, author, category, image, featured, published,
  slug, status, published_at, tags, sort_order, created_at, updated_at
) values (
  'f1f1e003-0003-4003-8003-000000000003'::uuid,
  'The Way, the Truth, and the Life',
  'In perilous times, the world searches for direction, reality, and eternal life. Jesus Christ alone is the Way, the Truth, and the Life.',
  $post2$<p>In the last days, men will be lovers of themselves, proud, and formulators of religion without power (2 Timothy 3:1–5). Yet humanity still searches for direction, reality, and something eternal.</p>
<h3>The Way — Direction</h3>
<p>The world offers many roads, but <em>"There is a way which seemeth right unto a man, but the end thereof are the ways of death"</em> (Proverbs 14:12). Jesus said, <em>"I am the way, the truth, and the life: no man cometh unto the Father, but by me"</em> (John 14:6).</p>
<h3>The Truth — Reality</h3>
<p>People are tired of artificial living. Christ is the personification of truth. In every storm, He remains the real answer — the Word made flesh.</p>
<h3>The Life — Eternal</h3>
<p>Worldly pleasures fade. Jesus came that we might have life, and have it more abundantly (John 10:10). Eternal life is found only in Him.</p>
<p>Turn to God today. Open life's instruction manual — the Holy Bible — and let Jesus Christ be your All in All.</p>$post2$,
  'Fire-Fire International Evangelical Church',
  'Teaching',
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1200&h=630&fit=crop',
  false,
  true,
  'the-way-truth-and-life',
  'published',
  now() - interval '2 days',
  'jesus,doctrine,salvation',
  2,
  now() - interval '2 days',
  now()
)
on conflict (id) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  author = excluded.author,
  category = excluded.category,
  image = excluded.image,
  featured = excluded.featured,
  published = excluded.published,
  slug = excluded.slug,
  status = excluded.status,
  published_at = excluded.published_at,
  tags = excluded.tags,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.blog_posts (
  id, title, excerpt, content, author, category, image, featured, published,
  slug, status, published_at, tags, sort_order, created_at, updated_at
) values (
  'f1f1e004-0004-4004-8004-000000000004'::uuid,
  'Jesus Christ: All in All',
  'He is the Redeemer, Justifier, Provider, Deliverer, and King. At the end of it all, you will discover He is truly All in All.',
  $post3$<p>Jesus is all you need. He is the All in All.</p>
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
<p><em>Theme: Fire-Fire International Evangelical Church Convention 2026 — April 2–6, Olomi, Ibadan.</em></p>$post3$,
  'Fire-Fire International Evangelical Church',
  'Worship',
  'https://images.unsplash.com/photo-1507692049794-de58290ffe11?w=1200&h=630&fit=crop',
  false,
  true,
  'jesus-christ-all-in-all',
  'published',
  now() - interval '3 days',
  'convention,theme,worship',
  3,
  now() - interval '3 days',
  now()
)
on conflict (id) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  author = excluded.author,
  category = excluded.category,
  image = excluded.image,
  featured = excluded.featured,
  published = excluded.published,
  slug = excluded.slug,
  status = excluded.status,
  published_at = excluded.published_at,
  tags = excluded.tags,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.blog_posts (
  id, title, excerpt, content, author, category, image, featured, published,
  slug, status, published_at, tags, sort_order, created_at, updated_at
) values (
  'f1f1e005-0005-4005-8005-000000000005'::uuid,
  'Top 10 Things You Did Not Learn in High School or College',
  'Life lessons from Psalm 23 — provision, satisfaction, renewal, direction, correction, preparation, and completion through the Good Shepherd.',
  $post4$<ol>
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
</ol>$post4$,
  'Fire-Fire Youth Ministry',
  'Education',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=630&fit=crop',
  false,
  true,
  'top-10-things-not-learned-in-school',
  'published',
  now() - interval '4 days',
  'education,youth,psalm-23',
  4,
  now() - interval '4 days',
  now()
)
on conflict (id) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  author = excluded.author,
  category = excluded.category,
  image = excluded.image,
  featured = excluded.featured,
  published = excluded.published,
  slug = excluded.slug,
  status = excluded.status,
  published_at = excluded.published_at,
  tags = excluded.tags,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.blog_posts (
  id, title, excerpt, content, author, category, image, featured, published,
  slug, status, published_at, tags, sort_order, created_at, updated_at
) values (
  'f1f1e006-0006-4006-8006-000000000006'::uuid,
  'Stepping Out Again',
  'The greatest enemy is not failure — it is the fear of trying again. God is the God of second chances.',
  $post5$<p><em>Luke 5:4–6; Isaiah 43:18–19</em></p>
<p>Healing from past failure begins when we bring our wounded confidence to God. He restores hearts and calls us to obey again — even after disappointment.</p>
<h3>The God of second chances</h3>
<p><em>"Remember ye not the former things, neither consider the things of old. Behold, I will do a new thing…"</em> (Isaiah 43:18–19). Abraham, Moses, Peter — all knew failure, yet God used them again.</p>
<h3>New nets for new harvests</h3>
<p>New seasons require new thinking, discipline, and structures. Launch out again at Christ's word. What failed shall flourish when Jesus is your All in All.</p>$post5$,
  'Fire-Fire Youth Ministry',
  'Faith',
  'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1200&h=630&fit=crop',
  false,
  true,
  'stepping-out-again',
  'published',
  now() - interval '5 days',
  'faith,restoration,obedience',
  5,
  now() - interval '5 days',
  now()
)
on conflict (id) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  author = excluded.author,
  category = excluded.category,
  image = excluded.image,
  featured = excluded.featured,
  published = excluded.published,
  slug = excluded.slug,
  status = excluded.status,
  published_at = excluded.published_at,
  tags = excluded.tags,
  sort_order = excluded.sort_order,
  updated_at = now();
