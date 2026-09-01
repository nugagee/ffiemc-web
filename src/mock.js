// Mock data for Fire-Fire International Evangelical Church website
import heroGo from "./assets/img/hero/go.jpg";
import heroCr1 from "./assets/img/cr_1.jpg";
import heroCr2 from "./assets/img/cr_2.jpg";
import heroHome2 from "./assets/img/hero/home2.jpeg";

export const churchInfo = {
  name: "Fire-Fire International Evangelical Church",
  motto: "Teach one by one another",
  mission: "We're on a mission to ignite hearts, transform lives, and spread the fire of God's love. Our ministry is dedicated to sharing the message of hope, redemption, and salvation through Jesus Christ. We're passionate about creating a platform where people can encounter the living God, experience spiritual awakening, and grow in their faith.",
  location: "Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Nigeria",
  phone: "+234 816 267 4805",
  email: "info@firefireintl.org",
  pastor: "Pastor S.O. Moronranti",
  logo: "https://customer-assets.emergentagent.com/job_divine-flame/artifacts/5bkxw8fc_Logo%20png.png"
};

export const heroSlides = [
  {
    id: 1,
    title: "Igniting Hearts, Transforming Lives",
    subtitle: "Experience God's Love in Our Community",
    description: "Join us as we spread the fire of God's love and build His kingdom together",
    backgroundImage: heroGo,
    ctaText: "Join Our Family",
    ctaLink: "/about",
    order: 0,
  },
  {
    id: 2,
    title: "Teaching One by One Another",
    subtitle: "Growing Together in Faith",
    description: "Discover the power of personal discipleship and community fellowship",
    backgroundImage: heroCr1,
    ctaText: "Our Services",
    ctaLink: "/services",
    order: 1,
  },
  {
    id: 3,
    title: "Come as You Are",
    subtitle: "Everyone Welcome, Every Sunday",
    description: "Experience worship, biblical teaching, and warm fellowship with us",
    backgroundImage: heroCr2,
    ctaText: "Plan Your Visit",
    ctaLink: "/contact",
    order: 2,
  },
  {
    id: 4,
    title: "A Place to Call Home",
    subtitle: "Beautiful Worship, Beautiful Community",
    description: "Find your spiritual home in our welcoming church family",
    backgroundImage: heroHome2,
    ctaText: "Contact Us",
    ctaLink: "/contact",
    order: 3,
  }
];

export const serviceTimes = [
  {
    id: 1,
    name: "Sitting at the Jesus feet",
    time: "8:00 AM - 9:00 AM",
    day: "Sunday",
    description: "A time of intimate worship and reflection"
  },
  {
    id: 2,
    name: "Main Service",
    time: "9:00 AM - 12:00 PM",
    day: "Sunday",
    description: "Our primary worship service with preaching and fellowship"
  },
  {
    id: 3,
    name: "Bible Study",
    time: "5:00 PM - 7:00 PM",
    day: "Monday",
    description: "Deep dive into God's Word and biblical teachings"
  },
  {
    id: 4,
    name: "Revival Hour",
    time: "5:00 PM - 7:00 PM",
    day: "Wednesday",
    description: "A midweek revival gathering for prayer, worship, and spiritual renewal"
  },
  {
    id: 5,
    name: "Night Vigil",
    time: "12:00 AM - 5:00 AM",
    day: "Friday",
    description: "Overnight prayer and worship as we seek God's face through the night"
  }
];

export const leadership = [
  {
    id: 1,
    name: "Pastor S.O. Moronranti",
    position: "Senior Pastor",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
    bio: "Pastor Moronranti has been serving the Lord for over 15 years, dedicated to spreading the gospel and nurturing spiritual growth in our community."
  },
  {
    id: 2,
    name: "Pastor (Mrs.) Grace Moronranti",
    position: "Assistant Pastor",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b3c5?w=300&h=300&fit=crop&crop=face",
    bio: "Pastor Grace leads our women's ministry and counseling services, bringing compassion and wisdom to our congregation."
  },
  {
    id: 3,
    name: "Deacon John Adebayo",
    position: "Church Secretary",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
    bio: "Deacon Adebayo oversees administrative duties and coordinates church activities with dedication and excellence."
  }
];

export const events = [
  {
    id: "youth-convention-2026",
    title: "Fire-Fire Youth Convention 2026 — The Refiner",
    date: "2026-09-09",
    time: "Day & Night · Wed 9 – Sat 12 Sep",
    location: "Fire-Fire HQ, Ibadan",
    description: "Join young people from every branch and campus for FFYC'26 — worship, teaching, and renewal. Register now for the annual youth convention.",
    image: "/ffyc-2026-flyer.png",
    featured: true,
    registerSlug: "youth-convention-2026",
  },
  {
    id: 2,
    title: "Holy Ghost Fire Conference",
    date: "2026-03-15",
    time: "9:00 AM",
    location: "Main Auditorium",
    description: "A powerful conference focused on receiving the baptism of the Holy Spirit and fire",
    image: "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=800&h=450&fit=crop",
  },
  {
    id: 3,
    title: "Marriage Enrichment Seminar",
    date: "2026-04-08",
    time: "4:00 PM",
    location: "Conference Room",
    description: "Building stronger marriages through biblical principles",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=450&fit=crop",
  },
];

export const sermons = [
  {
    id: 1,
    title: "Walking in the Fire of God",
    pastor: "Pastor S.O. Moronranti",
    date: "2025-01-26",
    series: "Fire Series",
    audioUrl: "#",
    videoUrl: "#",
    scripture: "Acts 2:1-4",
    description: "Understanding how to maintain the fire of God in your daily walk"
  },
  {
    id: 2,
    title: "Teach One by One Another",
    pastor: "Pastor S.O. Moronranti", 
    date: "2025-01-19",
    series: "Discipleship",
    audioUrl: "#",
    videoUrl: "#",
    scripture: "Matthew 28:19-20",
    description: "The importance of discipleship and teaching in the body of Christ"
  },
  {
    id: 3,
    title: "Hearts on Fire",
    pastor: "Pastor Grace Moronranti",
    date: "2025-01-12",
    series: "Fire Series",
    audioUrl: "#",
    videoUrl: "#", 
    scripture: "Luke 24:32",
    description: "How God ignites passion and purpose in our hearts"
  }
];

export const ministries = [
  {
    id: 1,
    name: "Fire Youth Ministry",
    description: "Empowering young people to live boldly for Christ",
    leader: "Pastor Michael Ade",
    meetingTime: "Saturdays 4:00 PM",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=250&fit=crop"
  },
  {
    id: 2,
    name: "Women of Fire",
    description: "Building godly women who impact their families and communities",
    leader: "Pastor Grace Moronranti",
    meetingTime: "First Saturday Monthly 10:00 AM",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=250&fit=crop"
  },
  {
    id: 3,
    name: "Men of Valor",
    description: "Raising strong men of God who lead with integrity",
    leader: "Deacon John Adebayo",
    meetingTime: "Third Saturday Monthly 6:00 AM",
    image: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=250&fit=crop"
  },
  {
    id: 4,
    name: "Fire Kids Ministry",
    description: "Teaching children to love Jesus from an early age",
    leader: "Sister Mary Oluwaseun",
    meetingTime: "Sundays during Main Service",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=250&fit=crop"
  }
];

export const blogPosts = [
  {
    id: 1,
    title: "The Power of Persistent Prayer",
    excerpt: "Discover how consistent prayer can transform your spiritual life and bring breakthrough in impossible situations.",
    content: "Prayer is the engine that drives the Christian life. When we pray persistently, we align ourselves with God's will and open doors for His power to work in our lives...",
    author: "Pastor S.O. Moronranti",
    date: "2025-01-20",
    category: "Spiritual Growth",
    featured: true,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=350&fit=crop"
  },
  {
    id: 2,
    title: "Living with Holy Fire",
    excerpt: "How to maintain the passion and zeal for God in your daily Christian walk.",
    content: "The fire of God is not just for special occasions or conferences. It's meant to burn continuously in our hearts as we live for Christ...",
    author: "Pastor Grace Moronranti",
    date: "2025-01-15",
    category: "Christian Living",
    featured: false,
    image: "https://images.unsplash.com/photo-1516475080664-ed2fc6a32937?w=600&h=350&fit=crop"
  },
  {
    id: 3,
    title: "Teaching the Next Generation",
    excerpt: "The importance of discipleship and how we can effectively teach one by one another.",
    content: "Our church motto 'Teach one by one another' reflects the heart of discipleship. Every believer has the responsibility to pour into others...",
    author: "Deacon John Adebayo",
    date: "2025-01-10",
    category: "Discipleship",
    featured: false,
    image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=600&h=350&fit=crop"
  }
];

export const prayerCategories = [
  "Personal Prayer Request",
  "Family",
  "Healing",
  "Financial",
  "Career/Business", 
  "Relationships",
  "Spiritual Growth",
  "Church Ministry",
  "Community/Nation",
  "Thanksgiving"
];

export const donations = {
  purposes: [
    { id: "tithe", name: "Tithe", description: "Regular tithe offering" },
    { id: "offering", name: "General Offering", description: "Support church operations" },
    { id: "building", name: "Building Fund", description: "Church building development" },
    { id: "missions", name: "Missions", description: "Support evangelism and outreach" },
    { id: "youth", name: "Youth Ministry", description: "Support youth programs" },
    { id: "special", name: "Special Projects", description: "Special church projects" }
  ]
};

export const testimonies = [
  {
    id: 1,
    name: "Sister Grace Adebayo",
    role: "Church Member",
    testimony: "God completely transformed my life when I joined Fire-Fire International. I was broken and lost, but through the love and support of this church family, I found healing and purpose. Pastor Moronranti's teachings helped me understand God's plan for my life.",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b3c5?w=150&h=150&fit=crop&crop=face",
    dateJoined: "2020",
    featured: true
  },
  {
    id: 2,
    name: "Brother Michael Okonkwo",
    role: "Youth Leader",
    testimony: "This church didn't just change my life - it saved it. I was heading down a wrong path as a young man, but the youth ministry here showed me a better way. Now I'm leading other young people to Christ and seeing God work miracles.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    dateJoined: "2019",
    featured: true
  },
  {
    id: 3,
    name: "Mrs. Funmi Johnson",
    role: "Women's Ministry",
    testimony: "After struggling with infertility for 8 years, I joined the prayer warriors at Fire-Fire International. Through persistent prayer and the faith of this congregation, God blessed me with twins! His faithfulness knows no bounds.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    dateJoined: "2018",
    featured: false
  },
  {
    id: 4,
    name: "Deacon Paul Okafor",
    role: "Administrative Team",
    testimony: "I've been in church all my life, but I never experienced the power of God like I do here. The teaching is practical, the fellowship is genuine, and the presence of God is tangible in every service.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    dateJoined: "2017",
    featured: false
  }
];

export const socialMediaPosts = [
  {
    id: 1,
    platform: "facebook",
    content: "Join us this Sunday for a powerful message on 'Walking in Divine Purpose'! Service starts at 9:00 AM. Come hungry for God's Word! 🔥✨ #FireFireIntl #SundayService #DivineMessage",
    timestamp: "2 hours ago",
    likes: 45,
    comments: 12,
    shares: 8,
    image: "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=400&h=250&fit=crop",
    link: "#"
  },
  {
    id: 2,
    platform: "instagram",
    content: "Our youth are on fire for God! 🙌 Last night's youth service was absolutely amazing. The next generation is rising up! #YouthOnFire #NextGeneration #FireFireYouth",
    timestamp: "5 hours ago",
    likes: 78,
    comments: 23,
    shares: 15,
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=250&fit=crop",
    link: "#"
  },
  {
    id: 3,
    platform: "twitter",
    content: "Prayer changes everything! Join our Wednesday prayer meeting at 6 PM. Let's seek God's face together and watch Him move mountains in our lives! 🙏 #PrayerWorks #WednesdayPrayer",
    timestamp: "1 day ago",
    likes: 32,
    comments: 8,
    shares: 12,
    image: null,
    link: "#"
  },
  {
    id: 4,
    platform: "tiktok",
    content: "Pastor's wisdom in 60 seconds! 💡 'Your current situation is not your final destination' - Pastor S.O. Moronranti. Keep believing! ✨",
    timestamp: "2 days ago",
    likes: 156,
    comments: 34,
    shares: 67,
    image: "https://images.unsplash.com/photo-1516475080664-ed2fc6a32937?w=400&h=250&fit=crop",
    link: "#"
  },
  {
    id: 5,
    platform: "audiomack",
    content: "🎵 NEW SERMON AUDIO: 'The Power of Persistent Faith' by Pastor S.O. Moronranti is now available! Download and be blessed wherever you are. 🔥",
    timestamp: "3 days ago",
    likes: 89,
    comments: 15,
    shares: 45,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=250&fit=crop",
    link: "#"
  },
  {
    id: 6,
    platform: "facebook",
    content: "Testimony Thursday! 🙌 Sister Grace shares how God healed her marriage and restored her family. God is still in the miracle business! Read her full testimony on our blog.",
    timestamp: "4 days ago",
    likes: 67,
    comments: 28,
    shares: 19,
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=250&fit=crop",
    link: "#"
  }
];