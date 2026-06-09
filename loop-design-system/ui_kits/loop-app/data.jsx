// Loop — sample data for the UI kit. Fictional people & chapters.
window.LoopData = (function () {
  const people = {
    priya:   { id:"priya",   name:"Priya Raman",    ring:"sage",        last:"3 weeks ago",  place:"Edinburgh",  close:true },
    marcus:  { id:"marcus",  name:"Marcus Bell",    ring:"none",        last:"in the spring", place:"London",     drifting:true },
    jo:      { id:"jo",      name:"Jo Okafor",      ring:"terracotta",  last:"on Tuesday",   place:"London",     close:true },
    tom:     { id:"tom",     name:"Tom Reid",       ring:"none",        last:"2 months ago", place:"Glasgow" },
    nadia:   { id:"nadia",   name:"Nadia Haddad",   ring:"sage",        last:"last weekend", place:"Edinburgh",  close:true },
    sam:     { id:"sam",     name:"Sam Whitfield",  ring:"none",        last:"a while back",  place:"Bristol",    drifting:true },
    elena:   { id:"elena",   name:"Elena Costa",    ring:"none",        last:"last month",   place:"Lisbon" },
    danny:   { id:"danny",   name:"Danny Mensah",   ring:"sage",        last:"yesterday",    place:"London",     close:true },
  };

  const chapters = [
    {
      id:"london", title:"The London Years", years:"2014 – 2019",
      cover:"../../assets/photos/city-canal.jpg",
      blurb:"Five years, three flats, and the people who made a huge city feel small.",
      crews:[
        { name:"The Camden flat", note:"Everyone who passed through 14b", members:["jo","marcus","danny"] },
        { name:"The agency", note:"Late nights and worse coffee", members:["sam","elena"] },
      ],
    },
    {
      id:"edinburgh", title:"Edinburgh Masters", years:"2019 – 2020",
      cover:"../../assets/photos/highlands.jpg",
      blurb:"One year up north. Cold mornings, long walks, the crew that got you through it.",
      crews:[
        { name:"The masters crew", note:"Library, pub, repeat", members:["priya","nadia"] },
        { name:"Marchmont flatmates", note:"Sunday roasts on Spottiswoode St", members:["tom","priya"] },
      ],
    },
    {
      id:"home", title:"Home & Family", years:"Always",
      cover:"../../assets/photos/memory-room.jpg",
      blurb:"The people who were there before any of it, and will be after.",
      crews:[
        { name:"The family", note:"Sunday calls and group chats", members:["tom","nadia"] },
      ],
    },
  ];

  // memory timeline for a person (Priya)
  const memories = {
    priya: [
      { date:"April 2026", kind:"note",   text:"Long phone call about her moving back to Edinburgh. She sounded happy." },
      { date:"Dec 2025",   kind:"photo",  photo:"../../assets/photos/coffee-notes.jpg", text:"Caught up over coffee when she was down in London for the week." },
      { date:"Aug 2025",   kind:"note",   text:"Her birthday. Sent a card — she still has the one from 2019." },
      { date:"Jun 2022",   kind:"photo",  photo:"../../assets/photos/gig.jpg", text:"That gig we drove three hours for and barely remember." },
      { date:"Sep 2019",   kind:"milestone", text:"Met in the second year, the day she moved into the room down the hall." },
    ],
  };

  // "On your mind" — one hero (a timely reason) then a couple of quieter nudges.
  const onYourMind = [
    { id:"jo",     reason:"Birthday in 4 days", hero:true,
      brief:"Five years of birthdays since the Camden flat. She sent that old photo last week — a card back would mean a lot." },
    { id:"marcus", reason:"You last spoke in the spring" },
    { id:"sam",    reason:"Quietly drifting lately" },
  ];

  return { people, chapters, memories, onYourMind };
})();
