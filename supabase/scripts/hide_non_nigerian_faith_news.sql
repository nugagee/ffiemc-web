-- OPTIONAL. Not a Supabase migration. Do not put this file in supabase/migrations.
-- Do not run it unless you intend to hide existing faith headlines.
--
-- Sets hidden = true on news_articles in categories christian and nigeria whose
-- title + excerpt fail an approximate Nigeria-and-Christian test. Education rows
-- are not touched. Rows that pass are left as they are, including rows that are
-- already hidden (this script does not unhide).
--
-- The test mirrors mentionsNigeria() and passesChristianContent() in
-- supabase/functions/fetch-christian-news/newsParse.ts. PostgreSQL word
-- boundaries are \y. It is approximate: HTML entities are not decoded, and
-- JavaScript and PostgreSQL regular expressions are not identical. A Nigerian
-- story that does not repeat a place, church body, or leader in the title or
-- excerpt can be hidden. Review the SELECT before the UPDATE.
--
-- The function is created in pg_temp, so it lasts only for this database session.
-- Run this file from the top. The SELECT does not change rows. The UPDATE does.
--
-- Preview count: not computed here. This script was not executed against the
-- live database.

drop function if exists pg_temp.news_keep_nigerian_christian(text, text);

create function pg_temp.news_keep_nigerian_christian(p_title text, p_excerpt text)
returns boolean
language sql
immutable
as $fn$
  with input as (
    select
      coalesce(p_title, '') as title,
      coalesce(p_title, '') || ' ' || coalesce(p_excerpt, '') as hay
  ),
  flags as (
    select
      title,
      hay,
      (
        hay ~* $geo$\y(?:nigeria|nigerian|nigerians|abuja|lagos|plateau|benue|kaduna|kano|borno|maiduguri|yobe|adamawa|taraba|bauchi|gombe|sokoto|zamfara|katsina|jigawa|kebbi|kwara|kogi|nasarawa|nassarawa|fct|jos|makurdi|enugu|anambra|onitsha|awka|owerri|abia|umuahia|ebonyi|abakaliki|calabar|akwa ibom|uyo|port harcourt|portharcourt|bayelsa|yenagoa|warri|asaba|benin city|ogun|abeokuta|ibadan|osun|osogbo|ondo|akure|ekiti|ado[- ]ekiti|ilorin|minna|lokoja|jalingo|dutse|birnin kebbi|gusau|damaturu|yola|lafia|middle belt|niger state|imo state|rivers state|delta state|cross river|ogun state|oyo state|ondo state|osun state|edo state|zaria|kafanchan|nsukka|ogbomoso|ogbomosho|ile[- ]ife|auchi|ekpoma|otukpo|gboko|wukari|mubi|potiskum|bida|suleja|keffi|ikeja|lekki|nnewi|orlu|badagry|sagamu|shagamu|fulanis?|middle[- ]belt|boko haram)\y$geo$
        or hay ~* $church$\y(?:deeper life|living faith|winners(?:['’]s?)? chapel|christ apostolic church|redeemed christian church(?: of god)?|redeemed church|mountain of fire(?: and miracles)?|christ embassy|church of nigeria|pentecostal fellowship of nigeria|christian association of nigeria|catholic bishops['’]? conference of nigeria)\y$church$
        or hay ~* $leaders$\y(?:adeboye|oyedepo|kumuyi|olukoya|oyakhilome|idahosa)\y$leaders$
        or hay ~ $nacronym$\y(?:CAN|PFN|CBCN|RCCG|MFM|CAC|ECWA|TREM)\y$nacronym$
      ) as is_nigeria,
      (
        hay ~* $strong$\y(?:church(?:es)?|bishops?|pastors?|christians?|christianity|anglicans?|catholics?|gospels?|clergy|dioceses?|synods?|priests?|congregations?|evangelicals?|pentecostals?|rccg|redeemed|baptists?|methodists?|presbyterians?|reverends?|archbishops?|primates?|parishes|parish|sermons?|bibles?|ministries|ministry|popes?|chapels?|cathedrals?|crusades?|revivals?|tithes?|jesus|christ|saviou?rs?|salvation|vatican|cardinals?|communion|choirs?|evangelists?|winners|mfm|deeper life|living faith|christ embassy|cac|ecwa|adeboye|oyedepo|kumuyi|olukoya|oyakhilome|idahosa)\y|\yrev\.$strong$
        or hay ~ $cacronym$\y(?:CAN|PFN|CBCN)\y$cacronym$
      ) as is_strong,
      hay ~* $soft$\y(?:pray|prays|prayed|praying|prayer|prayers|worship|worships|worshipper|worshippers|worshipping|worshiped|worshipped|prophet|prophets|apostle|apostles)\y$soft$ as is_soft,
      hay ~* $islamic$\y(?:mosques?|imams?|islamic|islamists?|islam|muslims?|qur['’]?ans?|koran|ramadan|hajj|eids?|shari['’]?a|muhammad|mohammed|mohammad|nscia|muric|sultan)\y$islamic$ as is_islamic,
      hay ~* $politics$\y(?:apc|pdp|labour party|election 2027|governorship|senator|house of reps|national assembly|inec|campaign rally)\y$politics$ as is_politics,
      (
        title ~* $strong$\y(?:church(?:es)?|bishops?|pastors?|christians?|christianity|anglicans?|catholics?|gospels?|clergy|dioceses?|synods?|priests?|congregations?|evangelicals?|pentecostals?|rccg|redeemed|baptists?|methodists?|presbyterians?|reverends?|archbishops?|primates?|parishes|parish|sermons?|bibles?|ministries|ministry|popes?|chapels?|cathedrals?|crusades?|revivals?|tithes?|jesus|christ|saviou?rs?|salvation|vatican|cardinals?|communion|choirs?|evangelists?|winners|mfm|deeper life|living faith|christ embassy|cac|ecwa|adeboye|oyedepo|kumuyi|olukoya|oyakhilome|idahosa)\y|\yrev\.$strong$
        or title ~* $soft$\y(?:pray|prays|prayed|praying|prayer|prayers|worship|worships|worshipper|worshippers|worshipping|worshiped|worshipped|prophet|prophets|apostle|apostles)\y$soft$
        or title ~ $cacronym$\y(?:CAN|PFN|CBCN)\y$cacronym$
      ) as title_hit
    from input
  )
  select
    is_nigeria
    and (is_strong or is_soft)
    and not (is_islamic and not is_strong)
    and not (is_politics and not title_hit)
  from flags;
$fn$;

-- Preview. category NULL is the total. would_hide is what the UPDATE below changes.
select
  category,
  count(*) as rows,
  count(*) filter (where hidden) as already_hidden,
  count(*) filter (where not hidden) as visible,
  count(*) filter (
    where not hidden
      and not pg_temp.news_keep_nigerian_christian(title, excerpt)
  ) as would_hide,
  count(*) filter (
    where not hidden
      and pg_temp.news_keep_nigerian_christian(title, excerpt)
  ) as would_stay_visible
from public.news_articles
where category in ('christian', 'nigeria')
group by rollup(category)
order by category nulls last;

-- Data change: hide visible faith rows that fail the test. Does not unhide.
update public.news_articles
set
  hidden = true,
  updated_at = now()
where category in ('christian', 'nigeria')
  and hidden = false
  and not pg_temp.news_keep_nigerian_christian(title, excerpt);
