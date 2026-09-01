export const CHURCH_FOUNDED_DATE = "April 3, 1991";
export const CHURCH_FOUNDED_YEAR = 1991;

export const CHURCH_HISTORY_DEFAULTS = {
  badge: "Our Story",
  heading: "History of the Church",
  intro:
    "From a small gathering of Fire youths and Fire children to a mountain ministry raising armies of faith — discover how God founded and has faithfully led Fire-Fire International Evangelical Church.",
  foundedDate: CHURCH_FOUNDED_DATE,
  founder: "Pastor S.O. Moronranti",
  foundingPlace: "Balaro Academy, Ibadan South East LGA, Oyo State",
  headquarters: "Papa/Agric area, off Olojuoro Road, Olunloyo, Ibadan",
  openingQuote:
    "The Holy Spirit — the founder of the Church as well as the foundation upon which Christianity is laid — is our Master.",
  story: [
    {
      title: "A Divine Beginning",
      body:
        "The Fire-Fire Evangelical Ministry began with a group of ten people — Fire youths and Fire children. It came into existence on April 3, 1991, after the General Overseer, Pastor S.O. Moronranti, received an order from the Lord for the establishment of this ministry.",
    },
    {
      title: "The Call of Our Founder",
      body:
        "Pastor S.O. Moronranti was for many years a cloth trader well known in the business until God directed him to leave the trade because of the inevitable ministerial assignment before him. He had no choice but to yield to the leading of the Holy Spirit. Before his call, he served as a Sunday school teacher and usher at Christ Apostolic Church Oke-Itura, Academy Ibadan, where he worked tremendously for the expansion of God's kingdom until he was called out.",
    },
    {
      title: "From Balaro to the Mountain",
      body:
        "The ministry started at Balaro Academy before the church moved to its headquarters at Papa/Agric area, off Olojuoro Road, Olunloyo, Ibadan. The church began as a normal Christian assembly until God gave authority for the mission of mountain ministry — the sole reason the church has her headquarters where it presently belongs.",
    },
    {
      title: "Gospel, Prayer & Holiness",
      body:
        "The merging of raw gospel preaching with scriptural prayer is the major belief upon which the church exhibits. Holiness is our watchword and our theme; on this we preach, teach, and spread the gospel. We are a Bible-believing church practising the Apostles' doctrine. Discipline and diligence are vital factors upheld in every section and department of the ministry.",
    },
    {
      title: "Teach One by One Another",
      body:
        "With reference to our motto, \"teach one by one another,\" we believe and practise evangelism as grace is given — for this is an order from the Lord. This is often done through writing and distribution of tracts, morning cry, handbills, posters, billboards, and media outreach via radio channels.",
    },
    {
      title: "Mountain Ministry & Bible College",
      body:
        "The mountain ministry has been a good channel through which people come to Christ through programmes held daily, weekly, monthly, and quarterly. The mountain ministry covers a 24-hour prayer cycle. The ministry has also begotten a theological centre — God's Quarry Bible College — a seminary that admits, trains, nurtures, and guides the armies of faith for the effective use of the Lord.",
    },
    {
      title: "Heaven — Our Focus",
      body:
        "The centrality of our preaching and teaching is Heaven — the kingdom of God. Brethren, you are charged to be there. God bless you.",
    },
  ],
  pillars: [
    {
      title: "Mountain Ministry",
      body: "A 24-hour prayer cycle on the mountain — daily, weekly, monthly, and quarterly programmes drawing souls to Christ.",
    },
    {
      title: "Holiness",
      body: "Our watchword and theme — we preach, teach, and spread the gospel on the foundation of holy living.",
    },
    {
      title: "Evangelism",
      body: "Teach one by one another — tracts, morning cry, handbills, posters, billboards, and radio outreach.",
    },
    {
      title: "God's Quarry Bible College",
      body: "A seminary training and nurturing armies of faith with undiluted theological teaching.",
    },
  ],
  timeline: [
    {
      year: "1991",
      title: "Ministry Established",
      description:
        "April 3, 1991 — Pastor S.O. Moronranti received the Lord's mandate. Fire-Fire Evangelical Ministry began with ten members: Fire youths and Fire children.",
    },
    {
      year: "1991",
      title: "Balaro Academy",
      description:
        "The church first gathered at Balaro Academy in Ibadan South East LGA, Oyo State, as a Christian assembly raised up by God.",
    },
    {
      year: "1990s",
      title: "Headquarters at Papa/Agric",
      description:
        "The church relocated to Papa/Agric, off Olojuoro Road, Olunloyo, Ibadan — the mountain ministry site appointed by God.",
    },
    {
      year: "2000s",
      title: "God's Quarry Bible College",
      description:
        "The ministry established God's Quarry Bible College to train, nurture, and equip believers for effective ministry.",
    },
    {
      year: "Today",
      title: "Fire-Fire International",
      description:
        "A Bible-believing, holiness-preaching, mountain-praying church reaching nations through gospel, prayer, and discipleship.",
    },
  ],
};

export function yearsOfMinistry(fromYear = CHURCH_FOUNDED_YEAR) {
  const years = new Date().getFullYear() - fromYear;
  return years > 0 ? `${years}+` : "1+";
}
