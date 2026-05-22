"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Row = { client: string; week: string; size: number; open: number; ctr: number; seg: string; subj: string };
type SortField = "week" | "openRate" | "ctr";
type SegFilter = "all" | "engagers" | "contacts";

// ── DATA ──────────────────────────────────────────────────────────────────────
const RAW: Row[] = [
  {client:"Paradise Pointe",week:"Jul 3, 2025",size:636,open:60.55,ctr:1.14,seg:"Recent Engagers",subj:"A Dreamy Summer Day, Already Mapped Out for You"},
  {client:"Riveria Stays",week:"Jul 3, 2025",size:935,open:58.31,ctr:1.55,seg:"Recent Engagers",subj:"Open to Explore: The Perfect Weekend Escape"},
  {client:"The Cohost Company",week:"Jul 3, 2025",size:237,open:47.81,ctr:0.88,seg:"Recent Engagers",subj:"Unlock the Magic of Joshua Tree This Summer"},
  {client:"Evergreen Cabins",week:"Jul 3, 2025",size:4643,open:65.92,ctr:0.70,seg:"Recent Engagers",subj:"This Summer Escape Is Anything But Ordinary"},
  {client:"Asheville River Cabins",week:"Jul 3, 2025",size:326,open:57.19,ctr:2.94,seg:"Recent Engagers",subj:"Paddle, Float, and Soak Up Summer in Asheville"},
  {client:"Treetop Escapes",week:"Jul 3, 2025",size:1018,open:63.18,ctr:0.51,seg:"Recent Engagers",subj:"Their Favorite Summer Moments Ready for You Too"},
  {client:"FLOHOM",week:"Jul 3, 2025",size:3248,open:61.95,ctr:1.57,seg:"Recent Engagers",subj:"Discover Last-Minute Weekend Openings"},
  {client:"Nordlys Lodging",week:"Jul 3, 2025",size:314,open:62.75,ctr:3.27,seg:"Recent Engagers",subj:"Only 3 Summer Openings Left—Will One Be Yours?"},
  {client:"Basecamp Stays",week:"Jul 3, 2025",size:104,open:64.71,ctr:2.94,seg:"Recent Engagers",subj:"Feel That? Summer Starts the Moment You Open This"},
  {client:"Green Springs Inn",week:"Jul 3, 2025",size:713,open:62.84,ctr:1.31,seg:"Recent Engagers",subj:"Feel That? Summer Starts the Moment You Open This"},
  {client:"Paradise Pointe",week:"Jul 11, 2025",size:686,open:61.52,ctr:1.31,seg:"Recent Engagers",subj:"Open to Discover Why Guests Keep Coming Back"},
  {client:"Riveria Stays",week:"Jul 11, 2025",size:903,open:47.73,ctr:1.55,seg:"Recent Engagers",subj:"Guests Are Obsessed with This Cabin – See Why"},
  {client:"The Cohost Company",week:"Jul 11, 2025",size:260,open:53.85,ctr:1.54,seg:"Recent Engagers",subj:"Start Crossing Off Your Summer Bucket List"},
  {client:"Evergreen Cabins",week:"Jul 11, 2025",size:4433,open:64.70,ctr:1.11,seg:"Recent Engagers",subj:"Open to Explore: The Perfect Weekend Escape"},
  {client:"Asheville River Cabins",week:"Jul 11, 2025",size:3901,open:32.99,ctr:1.49,seg:"All Contacts",subj:"Wake Up to River Views – Now 20% Off in July"},
  {client:"Treetop Escapes",week:"Jul 11, 2025",size:1053,open:61.06,ctr:0.76,seg:"Recent Engagers",subj:"The Summer You Will Never Forget Starts Here"},
  {client:"FLOHOM",week:"Jul 11, 2025",size:29065,open:11.33,ctr:0.45,seg:"All Contacts",subj:"SAVE 20% | Introducing FLOHOM 14"},
  {client:"Nordlys Lodging",week:"Jul 11, 2025",size:2100,open:12.19,ctr:0.43,seg:"All Contacts",subj:"Open to Discover Why Guests Keep Coming Back"},
  {client:"Basecamp Stays",week:"Jul 11, 2025",size:101,open:75.25,ctr:6.93,seg:"Recent Engagers",subj:"This Is What Summer Should Feel Like"},
  {client:"Green Springs Inn",week:"Jul 11, 2025",size:764,open:64.79,ctr:1.96,seg:"Recent Engagers",subj:"Open to Discover This Season's Must-Do Experience"},
  {client:"Paradise Pointe",week:"Jul 25, 2025",size:907,open:61.30,ctr:1.43,seg:"Recent Engagers",subj:"Last Call for Summer Getaways!"},
  {client:"Riveria Stays",week:"Jul 25, 2025",size:2492,open:17.74,ctr:0.96,seg:"All Contacts",subj:"Only a Few August Dates Left – Save $100 Now"},
  {client:"The Cohost Company",week:"Jul 25, 2025",size:320,open:59.69,ctr:2.50,seg:"Recent Engagers",subj:"Your New Desert Escape: Be Among the First to Stay!"},
  {client:"Evergreen Cabins",week:"Jul 25, 2025",size:4549,open:71.16,ctr:0.88,seg:"Recent Engagers",subj:"Last Chance for a Summer Getaway!"},
  {client:"Asheville River Cabins",week:"Jul 25, 2025",size:4147,open:32.89,ctr:0.94,seg:"All Contacts",subj:"Stay Longer, Save More—But Not for Long!"},
  {client:"Treetop Escapes",week:"Jul 25, 2025",size:1210,open:61.07,ctr:0.83,seg:"Recent Engagers",subj:"Is This Your Dream Getaway? (Spoiler: Yes.)"},
  {client:"FLOHOM",week:"Jul 25, 2025",size:3783,open:67.43,ctr:0.85,seg:"Recent Engagers",subj:"Open to Discover Why Guests Keep Coming Back"},
  {client:"Nordlys Lodging",week:"Jul 25, 2025",size:2117,open:12.33,ctr:1.18,seg:"All Contacts",subj:"Final August Dates at MetalLark Tower"},
  {client:"Green Springs Inn",week:"Jul 25, 2025",size:947,open:51.64,ctr:2.32,seg:"Recent Engagers",subj:"Last Call: Your Summer Escape is Just a Drive Away"},
  {client:"Starlight Haven WL",week:"Jul 25, 2025",size:1397,open:48.89,ctr:1.43,seg:"Recent Engagers",subj:"Cool Off This August, Your Perfect Retreat Awaits"},
  {client:"Starlight Haven HS",week:"Jul 25, 2025",size:1157,open:51.25,ctr:0.52,seg:"Recent Engagers",subj:"Still Dreaming of Summer? August Dates Are Going Fast!"},
  {client:"Paradise Pointe",week:"Aug 1, 2025",size:987,open:49.68,ctr:1.05,seg:"Recent Engagers",subj:"So Long, Summer - Last Chance for a Getaway!"},
  {client:"Riveria Stays",week:"Aug 1, 2025",size:1069,open:36.84,ctr:1.57,seg:"Recent Engagers",subj:"That Last Summer Feeling is Fading"},
  {client:"The Cohost Company",week:"Aug 1, 2025",size:370,open:58.40,ctr:1.10,seg:"Recent Engagers",subj:"One Last Summer Escape? Let's Make It Count."},
  {client:"Evergreen Cabins",week:"Aug 1, 2025",size:4770,open:65.80,ctr:1.11,seg:"Recent Engagers",subj:"Your Cozy Fall Cabin Retreat Awaits"},
  {client:"Asheville River Cabins",week:"Aug 1, 2025",size:512,open:56.73,ctr:1.22,seg:"Recent Engagers",subj:"Your Long Weekend is Calling – Answer with a Cabin Stay"},
  {client:"Treetop Escapes",week:"Aug 1, 2025",size:3483,open:24.61,ctr:0.88,seg:"Recent Engagers",subj:"Surprise Them with a Treetop Escape They'll Never Forget"},
  {client:"FLOHOM",week:"Aug 1, 2025",size:32730,open:9.84,ctr:0.40,seg:"All Contacts",subj:"Launch Special – 20% Off Your Stay!"},
  {client:"Nordlys Lodging",week:"Aug 1, 2025",size:398,open:70.63,ctr:5.29,seg:"Recent Engagers",subj:"A Different Kind of Northern Light"},
  {client:"Green Springs Inn",week:"Aug 1, 2025",size:1025,open:56.52,ctr:1.42,seg:"Recent Engagers",subj:"Don't Let Labor Day Slip Away — Limited Cabins Left!"},
  {client:"Starlight Haven WL",week:"Aug 1, 2025",size:1485,open:49.15,ctr:1.30,seg:"Recent Engagers",subj:"Last Call for Labor Day Getaways – Don't Miss Out!"},
  {client:"Starlight Haven HS",week:"Aug 1, 2025",size:1266,open:48.82,ctr:0.89,seg:"Recent Engagers",subj:"Labor Day Done Right - Book Before It's Gone!"},
  {client:"Paradise Pointe",week:"Aug 8, 2025",size:1878,open:61.71,ctr:1.44,seg:"Recent Engagers",subj:"Hurry! Fall Dates are Going, Going, Gone..."},
  {client:"Riveria Stays",week:"Aug 8, 2025",size:989,open:50.53,ctr:2.54,seg:"Recent Engagers",subj:"Before Summer Slips Away"},
  {client:"The Cohost Company",week:"Aug 8, 2025",size:415,open:61.93,ctr:1.45,seg:"Recent Engagers",subj:"What Do 500+ Guests Know That You Don't?"},
  {client:"Evergreen Cabins",week:"Aug 8, 2025",size:4948,open:73.22,ctr:0.55,seg:"Recent Engagers",subj:"1,500 Five-Star Reviews And Counting!"},
  {client:"Asheville River Cabins",week:"Aug 8, 2025",size:624,open:55.70,ctr:1.49,seg:"Recent Engagers",subj:"A Cabin. A River. And a Deal You Can't Miss."},
  {client:"Treetop Escapes",week:"Aug 8, 2025",size:1625,open:61.29,ctr:2.71,seg:"Recent Engagers",subj:"Soak, Steam and Stargaze - Summer Dates are Almost Gone!"},
  {client:"FLOHOM",week:"Aug 8, 2025",size:4361,open:56.68,ctr:0.96,seg:"Recent Engagers",subj:"1,000 Five-Star Reviews And Counting!"},
  {client:"Nordlys Lodging",week:"Aug 8, 2025",size:395,open:57.07,ctr:4.97,seg:"Recent Engagers",subj:"Trade City Noise for Autumn Stillness at Nordlys"},
  {client:"Basecamp Stays",week:"Aug 8, 2025",size:114,open:67.27,ctr:7.27,seg:"Recent Engagers",subj:"Your Key to the Tetons Is Just a Click Away"},
  {client:"Green Springs Inn",week:"Aug 8, 2025",size:1068,open:57.36,ctr:1.97,seg:"Recent Engagers",subj:"Ashland Awaits - Are You Packed?"},
  {client:"Starlight Haven WL",week:"Aug 8, 2025",size:1529,open:56.27,ctr:1.93,seg:"Recent Engagers",subj:"Labor Day on the water, without the crowds"},
  {client:"Starlight Haven HS",week:"Aug 8, 2025",size:1354,open:55.50,ctr:0.76,seg:"Recent Engagers",subj:"What if your Labor Day looked like this"},
  {client:"Paradise Pointe",week:"Aug 22, 2025",size:2025,open:59.16,ctr:0.74,seg:"Recent Engagers",subj:"Don't Wait! Our Fall calendar is filling up FAST!"},
  {client:"Riveria Stays",week:"Aug 22, 2025",size:3053,open:17.43,ctr:0.92,seg:"All Contacts",subj:"This Is What Fall Should Feel Like"},
  {client:"The Cohost Company",week:"Aug 22, 2025",size:456,open:63.82,ctr:1.10,seg:"Recent Engagers",subj:"Last-minute Labor Day dates just opened up!"},
  {client:"Evergreen Cabins",week:"Aug 22, 2025",size:5048,open:70.68,ctr:0.97,seg:"Recent Engagers",subj:"Final call for a summer escape! Don't miss out."},
  {client:"Asheville River Cabins",week:"Aug 22, 2025",size:629,open:53.05,ctr:1.98,seg:"Recent Engagers",subj:"Asheville slows down midweek, will you?"},
  {client:"Treetop Escapes",week:"Aug 22, 2025",size:1743,open:52.90,ctr:1.20,seg:"Recent Engagers",subj:"Book your last summer weekend before it's gone!"},
  {client:"FLOHOM",week:"Aug 22, 2025",size:4118,open:63.16,ctr:1.26,seg:"Recent Engagers",subj:"Last-minute Labor Day dates just opened up!"},
  {client:"Nordlys Lodging",week:"Aug 22, 2025",size:390,open:63.33,ctr:2.31,seg:"Recent Engagers",subj:"There's a cabin in the woods you'll want to find"},
  {client:"Green Springs Inn",week:"Aug 22, 2025",size:1037,open:59.96,ctr:2.11,seg:"Recent Engagers",subj:"Don't wait! Fall bookings are going quickly."},
  {client:"Starlight Haven WL",week:"Aug 22, 2025",size:1590,open:54.09,ctr:2.58,seg:"Recent Engagers",subj:"A Hot Tub and a View... on a Tuesday?"},
  {client:"Starlight Haven HS",week:"Aug 22, 2025",size:1410,open:56.17,ctr:1.03,seg:"Recent Engagers",subj:"Your Weekday Just Got an Upgrade"},
  {client:"Paradise Pointe",week:"Aug 29, 2025",size:5018,open:28.90,ctr:1.02,seg:"All Contacts",subj:"Don't wait! Fall bookings are going quickly"},
  {client:"Riveria Stays",week:"Aug 29, 2025",size:3170,open:18.30,ctr:0.88,seg:"All Contacts",subj:"Escape to Cozy Nights and Autumn Views"},
  {client:"Evergreen Cabins",week:"Aug 29, 2025",size:13081,open:32.41,ctr:1.21,seg:"All Contacts",subj:"These last-minute dates at our Spa Cabin won't last"},
  {client:"FLOHOM",week:"Aug 29, 2025",size:34252,open:11.16,ctr:0.57,seg:"All Contacts",subj:"New FLOHOM Arrival in Inner Harbor – Limited Launch Offer!"},
  {client:"Nordlys Lodging",week:"Aug 29, 2025",size:2274,open:25.07,ctr:2.99,seg:"All Contacts",subj:"We Thought You Should See This First..."},
  {client:"Green Springs Inn",week:"Aug 29, 2025",size:3303,open:22.49,ctr:1.49,seg:"All Contacts",subj:"Our Labor Day calendar has a last-minute opening..."},
  {client:"Paradise Pointe",week:"Sep 12, 2025",size:2573,open:63.35,ctr:2.22,seg:"Recent Engagers",subj:"A Fresh New Look is Here. Ready to See It?"},
  {client:"Riveria Stays",week:"Sep 12, 2025",size:1037,open:50.65,ctr:1.10,seg:"Recent Engagers",subj:"Your new favorite memory starts here..."},
  {client:"The Cohost Company",week:"Sep 12, 2025",size:545,open:63.67,ctr:2.20,seg:"Recent Engagers",subj:"The Joshua Tree Itinerary You've Been Waiting For"},
  {client:"Evergreen Cabins",week:"Sep 12, 2025",size:6074,open:68.37,ctr:1.00,seg:"Recent Engagers",subj:"Would You Escape Here This Fall?"},
  {client:"Asheville River Cabins",week:"Sep 12, 2025",size:688,open:56.52,ctr:2.85,seg:"Recent Engagers",subj:"September's Secret: Your Peaceful Asheville Escape"},
  {client:"Treetop Escapes",week:"Sep 12, 2025",size:2121,open:60.16,ctr:1.79,seg:"Recent Engagers",subj:"Trade Your To-Do List for a Treehouse"},
  {client:"Nordlys Lodging",week:"Sep 12, 2025",size:704,open:66.48,ctr:2.98,seg:"Recent Engagers",subj:"Your Chapter Awaits"},
  {client:"Green Springs Inn",week:"Sep 12, 2025",size:1170,open:51.70,ctr:2.88,seg:"Recent Engagers",subj:"200 Five-Star Reviews And Counting!"},
  {client:"Starlight Haven WL",week:"Sep 12, 2025",size:4466,open:66.00,ctr:4.05,seg:"Recent Engagers",subj:"Shhh... The Secret to a Perfect Lake Trip is Out"},
  {client:"Starlight Haven HS",week:"Sep 12, 2025",size:4115,open:67.30,ctr:1.30,seg:"Recent Engagers",subj:"A Hot Springs Getaway Only a Few Know About."},
  {client:"Paradise Pointe",week:"Sep 26, 2025",size:2758,open:62.69,ctr:0.76,seg:"Recent Engagers",subj:"The leaves are changing—your plans should too!"},
  {client:"Riveria Stays",week:"Sep 26, 2025",size:3635,open:16.26,ctr:0.39,seg:"All Contacts",subj:"Last-Minute Luxe: Harbor Serenity Is Open for You"},
  {client:"Evergreen Cabins",week:"Sep 26, 2025",size:6634,open:66.52,ctr:1.44,seg:"Recent Engagers",subj:"Don't miss these rare weekend openings at Evergreen Cabins"},
  {client:"Asheville River Cabins",week:"Sep 26, 2025",size:854,open:60.56,ctr:2.43,seg:"Recent Engagers",subj:"This Is Where Autumn Comes Alive"},
  {client:"Treetop Escapes",week:"Sep 26, 2025",size:2298,open:62.23,ctr:0.87,seg:"Recent Engagers",subj:"Book now or miss out on the coziest season of the year..."},
  {client:"Nordlys Lodging",week:"Sep 26, 2025",size:2341,open:27.25,ctr:1.28,seg:"All Contacts",subj:"Autumn is Calling - Book Your Cabin Retreat Now"},
  {client:"Starlight Haven WL",week:"Sep 26, 2025",size:4558,open:66.16,ctr:1.19,seg:"Recent Engagers",subj:"Fall is calling from the lake"},
  {client:"Starlight Haven HS",week:"Sep 26, 2025",size:4248,open:66.81,ctr:1.10,seg:"Recent Engagers",subj:"Found: Your Perfect Fall Retreat"},
  {client:"Paradise Pointe",week:"Oct 3, 2025",size:7607,open:30.55,ctr:0.62,seg:"All Contacts",subj:"Click to Access Your Fall Family Escape"},
  {client:"Riveria Stays",week:"Oct 3, 2025",size:4287,open:18.45,ctr:0.42,seg:"All Contacts",subj:"Your autumn escape to the water's edge is waiting"},
  {client:"The Cohost Company",week:"Oct 3, 2025",size:1722,open:27.40,ctr:1.33,seg:"All Contacts",subj:"Reset Your Rhythm in Joshua Tree"},
  {client:"Evergreen Cabins",week:"Oct 3, 2025",size:16535,open:33.00,ctr:0.70,seg:"All Contacts",subj:"You Won't Want to Miss This..."},
  {client:"Asheville River Cabins",week:"Oct 3, 2025",size:6169,open:38.04,ctr:2.13,seg:"All Contacts",subj:"A Cabin, a River, and a Deal You'll Regret Missing"},
  {client:"Treetop Escapes",week:"Oct 3, 2025",size:6687,open:26.77,ctr:0.84,seg:"All Contacts",subj:"Your Golden Treehouse Awaits Beneath the Fall Leaves"},
  {client:"FLOHOM",week:"Oct 3, 2025",size:37385,open:9.70,ctr:0.17,seg:"All Contacts",subj:"Celebrate and Save 20% on Your FLOHOM Getaway"},
  {client:"Nordlys Lodging",week:"Oct 3, 2025",size:2582,open:31.69,ctr:1.99,seg:"All Contacts",subj:"Wisconsin's Secret Season is Here"},
  {client:"Green Springs Inn",week:"Oct 3, 2025",size:3722,open:36.32,ctr:3.03,seg:"All Contacts",subj:"Your Quiet Retreat is Just Up the Mountain"},
  {client:"Starlight Haven WL",week:"Oct 3, 2025",size:39606,open:8.11,ctr:0.19,seg:"All Contacts",subj:"You Should Be Here - Fall Edition"},
  {client:"Starlight Haven HS",week:"Oct 3, 2025",size:37538,open:8.33,ctr:0.24,seg:"All Contacts",subj:"Cozy Up: Your Perfect Autumn Vibe Starts Here"},
  {client:"Paradise Pointe",week:"Oct 10, 2025",size:3317,open:62.01,ctr:0.87,seg:"Recent Engagers",subj:"Cozy Up: Your Perfect Autumn Getaway Is Waiting..."},
  {client:"Riveria Stays",week:"Oct 10, 2025",size:1223,open:47.97,ctr:0.76,seg:"Recent Engagers",subj:"Last chance to experience Harbor Serenity this fall"},
  {client:"Evergreen Cabins",week:"Oct 10, 2025",size:6912,open:66.60,ctr:1.09,seg:"Recent Engagers",subj:"What if you had one more weekend?"},
  {client:"Asheville River Cabins",week:"Oct 10, 2025",size:1066,open:50.68,ctr:1.35,seg:"Recent Engagers",subj:"Fall Colors Look Better From Here..."},
  {client:"Treetop Escapes",week:"Oct 10, 2025",size:2393,open:51.73,ctr:0.71,seg:"Recent Engagers",subj:"Fall's Final Fling - Don't Miss the Last Few Fall Weekends"},
  {client:"FLOHOM",week:"Oct 10, 2025",size:35404,open:10.27,ctr:0.16,seg:"All Contacts",subj:"LAST CALL: 20% Off Your Escape"},
  {client:"Green Springs Inn",week:"Oct 10, 2025",size:3722,open:36.32,ctr:3.03,seg:"All Contacts",subj:"Your Quiet Retreat is Just Up the Mountain"},
  {client:"Starlight Haven WL",week:"Oct 10, 2025",size:4902,open:66.05,ctr:1.20,seg:"Recent Engagers",subj:"Unplug and Unwind: Find Your Lakefront Peace This Autumn"},
  {client:"Starlight Haven HS",week:"Oct 10, 2025",size:4729,open:66.25,ctr:1.18,seg:"Recent Engagers",subj:"Fall Colors Look Better From Here"},
  {client:"Paradise Pointe",week:"Nov 13, 2025",size:10738,open:25.99,ctr:0.74,seg:"All Contacts",subj:"Shhh... Early Access to Our Secret Black Friday Deal"},
  {client:"Riveria Stays",week:"Nov 13, 2025",size:937,open:76.97,ctr:1.11,seg:"All Contacts",subj:"Give the Gift of a Getaway — 20% Off"},
  {client:"The Cohost Company",week:"Nov 13, 2025",size:690,open:71.16,ctr:1.01,seg:"Recent Engagers",subj:"Prime Holiday Dates Are Going Fast! Don't Miss the Magic."},
  {client:"Evergreen Cabins",week:"Nov 13, 2025",size:7250,open:80.06,ctr:1.12,seg:"Recent Engagers",subj:"The Perfect Holiday Gift? A Cozy Cabin Getaway"},
  {client:"Asheville River Cabins",week:"Nov 13, 2025",size:3773,open:31.16,ctr:1.75,seg:"Past Guests",subj:"Shhh... Early Access to Our Secret Black Friday Deal"},
  {client:"Treetop Escapes",week:"Nov 13, 2025",size:6833,open:19.58,ctr:0.42,seg:"All Contacts",subj:"Black Friday Just Got Better (See Why)"},
  {client:"FLOHOM",week:"Nov 13, 2025",size:37240,open:10.22,ctr:0.20,seg:"All Contacts",subj:"Give the Gift of a Getaway — 20% Off"},
  {client:"Green Springs Inn",week:"Nov 13, 2025",size:4360,open:35.42,ctr:2.41,seg:"All Contacts",subj:"Give Nature, Not Stuff: 20% Off Peaceful Getaways"},
  {client:"Starlight Haven WL",week:"Nov 13, 2025",size:42542,open:9.01,ctr:0.18,seg:"All Contacts",subj:"Black Friday Countdown: Kayaks and Cozy Cabins!"},
  {client:"Starlight Haven HS",week:"Nov 13, 2025",size:39910,open:9.93,ctr:0.17,seg:"All Contacts",subj:"Black Friday Countdown: Hot Springs Edition"},
  {client:"Paradise Pointe",week:"Dec 7, 2025",size:12857,open:22.05,ctr:0.31,seg:"All Contacts",subj:"The Easiest Gift That Feels Extraordinary"},
  {client:"The Cohost Company",week:"Dec 7, 2025",size:762,open:75.07,ctr:0.79,seg:"Recent Engagers",subj:"Running Out of Gift Ideas? We Have the Perfect One"},
  {client:"Treetop Escapes",week:"Dec 7, 2025",size:2087,open:59.61,ctr:0.77,seg:"Recent Engagers",subj:"Still Need a Gift? A Getaway Never Misses"},
  {client:"FLOHOM",week:"Dec 7, 2025",size:41565,open:10.23,ctr:0.07,seg:"All Contacts",subj:"Give the Gift of Peace, Luxury and Memory-Making"},
  {client:"Evergreen Cabins",week:"Dec 7, 2025",size:20336,open:37.33,ctr:0.38,seg:"All Contacts",subj:"Stuck on a Gift? Let Them Choose Their Dream Cabin."},
  {client:"Paradise Pointe",week:"Jan 4, 2026",size:13611,open:12.36,ctr:0.25,seg:"All Contacts",subj:"The 2026 bucket list you actually need"},
  {client:"The Cohost Company",week:"Jan 4, 2026",size:2156,open:29.08,ctr:0.14,seg:"All Contacts",subj:"Don't Start 2026 Without This"},
  {client:"Treetop Escapes",week:"Jan 4, 2026",size:7521,open:11.35,ctr:0.25,seg:"All Contacts",subj:"New year, new view from 25 feet up"},
  {client:"FLOHOM",week:"Jan 4, 2026",size:40228,open:8.59,ctr:0.19,seg:"All Contacts",subj:"Something Special is Waiting for You Aboard..."},
  {client:"Evergreen Cabins",week:"Jan 4, 2026",size:27057,open:15.33,ctr:0.27,seg:"All Contacts",subj:"These Trips Sell Out Every Year. Don't Miss Your Chance"},
  {client:"Paradise Pointe",week:"Jan 11, 2026",size:4031,open:45.73,ctr:0.91,seg:"Recent Engagers",subj:"Start your year where the views never end"},
  {client:"The Cohost Company",week:"Jan 11, 2026",size:835,open:70.47,ctr:1.10,seg:"Recent Engagers",subj:"A New Year deserves a new view"},
  {client:"Treetop Escapes",week:"Jan 11, 2026",size:1636,open:52.05,ctr:1.07,seg:"Recent Engagers",subj:"New Year, New View: Start 2026 in the Treetops"},
  {client:"FLOHOM",week:"Jan 11, 2026",size:3762,open:73.35,ctr:1.46,seg:"Recent Engagers",subj:"Unplug to Recharge: Your 2026 Sanctuary Awaits"},
  {client:"Evergreen Cabins",week:"Jan 11, 2026",size:9012,open:32.49,ctr:0.89,seg:"Recent Engagers",subj:"A little less to-do, a little more ta-da"},
  {client:"Asheville River Cabins",week:"Jan 11, 2026",size:840,open:68.80,ctr:1.72,seg:"Recent Engagers",subj:"Turn 2026 Into a Year You'll Talk About"},
  {client:"Green Springs Inn",week:"Jan 11, 2026",size:1759,open:39.41,ctr:3.03,seg:"Recent Engagers",subj:"Turn 2026 Into a Year You'll Talk About"},
  {client:"Paradise Pointe",week:"Feb 12, 2026",size:3534,open:61.87,ctr:3.72,seg:"Recent Engagers",subj:"Give the Kids a Break (and Yourself One Too)"},
  {client:"The Cohost Company",week:"Feb 12, 2026",size:1007,open:70.26,ctr:1.13,seg:"Recent Engagers",subj:"Warmer Days, Fewer Dates Left"},
  {client:"Treetop Escapes",week:"Feb 12, 2026",size:1259,open:66.99,ctr:3.36,seg:"Recent Engagers",subj:"Give the Kids a Break (and Yourself One Too)"},
  {client:"FLOHOM",week:"Feb 12, 2026",size:4471,open:58.73,ctr:3.61,seg:"Recent Engagers",subj:"A little more magic, a lot more we time this February"},
  {client:"Evergreen Cabins",week:"Feb 12, 2026",size:6380,open:53.88,ctr:0.86,seg:"Recent Engagers",subj:"What's Left for March Might Surprise You"},
  {client:"Starlight Haven WL",week:"Feb 12, 2026",size:4984,open:71.93,ctr:3.68,seg:"Recent Engagers",subj:"Something to Know Before You Plan a Spring Getaway"},
  {client:"Starlight Haven HS",week:"Feb 12, 2026",size:5712,open:80.42,ctr:0.83,seg:"Recent Engagers",subj:"Warmer Days, Fewer Dates Left"},
  {client:"Green Springs Inn",week:"Feb 12, 2026",size:1372,open:75.11,ctr:3.15,seg:"Recent Engagers",subj:"What's Left for March Might Surprise You"},
  {client:"Paradise Pointe",week:"Mar 10, 2026",size:3489,open:67.25,ctr:1.13,seg:"Recent Engagers",subj:"Why you shouldn't wait until June to visit"},
  {client:"The Cohost Company",week:"Mar 10, 2026",size:1096,open:49.17,ctr:1.02,seg:"Recent Engagers",subj:"Can I show you our favorite spring itinerary?"},
  {client:"Treetop Escapes",week:"Mar 10, 2026",size:1190,open:76.76,ctr:1.03,seg:"Recent Engagers",subj:"Can I show you our favorite spring itinerary?"},
  {client:"FLOHOM",week:"Mar 10, 2026",size:6649,open:72.21,ctr:0.74,seg:"All Contacts",subj:"20% Off FLOHOM 13 - Port Noir Ends Tomorrow"},
  {client:"Evergreen Cabins",week:"Mar 10, 2026",size:4751,open:69.94,ctr:0.61,seg:"Recent Engagers",subj:"Can I show you our favorite spring itinerary?"},
  {client:"Starlight Haven WL",week:"Mar 10, 2026",size:4309,open:82.45,ctr:0.99,seg:"Recent Engagers",subj:"Ever wondered what a perfect day looks like?"},
  {client:"Starlight Haven HS",week:"Mar 10, 2026",size:5712,open:80.58,ctr:0.88,seg:"Recent Engagers",subj:"Why you shouldn't wait until June to visit."},
  {client:"Green Springs Inn",week:"Mar 10, 2026",size:1574,open:75.97,ctr:2.66,seg:"Recent Engagers",subj:"Ever wondered what a perfect day looks like?"},
  {client:"Paradise Pointe",week:"Apr 9, 2026",size:3406,open:77.85,ctr:1.02,seg:"Recent Engagers",subj:"Summer is almost here, have you booked yet?"},
  {client:"The Cohost Company",week:"Apr 9, 2026",size:1247,open:77.22,ctr:0.90,seg:"Recent Engagers",subj:"Summer dates in Joshua Tree are going fast, have you claimed yours?"},
  {client:"Treetop Escapes",week:"Apr 9, 2026",size:1337,open:80.03,ctr:0.92,seg:"Recent Engagers",subj:"Summer dates are filling up, have you checked yours yet?"},
  {client:"FLOHOM",week:"Apr 9, 2026",size:4843,open:78.73,ctr:1.03,seg:"Recent Engagers",subj:"Summer on these waterfront houseboats fill faster than you think."},
  {client:"Evergreen Cabins",week:"Apr 9, 2026",size:4192,open:81.19,ctr:1.26,seg:"Recent Engagers",subj:"Summer dates are going, have you checked yours yet?"},
  {client:"Starlight Haven WL",week:"Apr 9, 2026",size:3769,open:84.80,ctr:0.70,seg:"Recent Engagers",subj:"Don't Miss Your Summer Escape"},
  {client:"Starlight Haven HS",week:"Apr 9, 2026",size:4363,open:81.84,ctr:0.51,seg:"Recent Engagers",subj:"Don't Miss Your Summer Escape"},
  {client:"Asheville River Cabins",week:"Apr 9, 2026",size:2128,open:76.43,ctr:1.03,seg:"Recent Engagers",subj:"Don't Miss Your Summer Escape"},
  {client:"Green Springs Inn",week:"Apr 9, 2026",size:1398,open:75.53,ctr:1.96,seg:"Recent Engagers",subj:"Don't Miss Your Summer Escape"},
  {client:"Paradise Pointe",week:"May 7, 2026",size:5532,open:56.81,ctr:1.05,seg:"All Contacts",subj:"The families getting the best price all have one thing in common."},
  {client:"The Cohost Company",week:"May 7, 2026",size:2039,open:62.55,ctr:0.61,seg:"All Contacts",subj:"Most groups don't know they're paying more than they have to."},
  {client:"Treetop Escapes",week:"May 7, 2026",size:2014,open:64.73,ctr:2.09,seg:"All Contacts",subj:"Most couples don't know there's a smarter way to book this."},
  {client:"FLOHOM",week:"May 7, 2026",size:7716,open:60.89,ctr:0.85,seg:"Recent Engagers",subj:"What do couples keep coming back to at FLOHOM?"},
  {client:"Evergreen Cabins",week:"May 7, 2026",size:4092,open:66.48,ctr:1.11,seg:"All Contacts",subj:"Most couples don't know this when they book their cabin stay."},
  {client:"Starlight Haven WL",week:"May 7, 2026",size:4596,open:83.62,ctr:3.67,seg:"Recent Engagers",subj:"The Smarter Way to Book Is Right Here"},
  {client:"Starlight Haven HS",week:"May 7, 2026",size:5112,open:81.49,ctr:1.36,seg:"Recent Engagers",subj:"There's a better way to book your next stay"},
  {client:"Green Springs Inn",week:"May 7, 2026",size:1551,open:67.57,ctr:2.37,seg:"Recent Engagers",subj:"There's a better way to book your next stay"},
  {client:"Asheville River Cabins",week:"May 7, 2026",size:2937,open:77.08,ctr:1.39,seg:"Recent Engagers",subj:"Still paying extra fees every time you book a cabin?"},
];

const PALETTE = ["#2563EB","#D97706","#16A34A","#DC2626","#7C3AED","#0891B2","#DB2777","#65A30D","#EA580C","#0369A1","#9333EA","#B45309","#059669","#E11D48","#4F46E5"];
const ALL_CLIENTS = [...new Set(RAW.map(d => d.client))].sort();
const CLIENT_COLOR: Record<string, string> = {};
ALL_CLIENTS.forEach((c, i) => { CLIENT_COLOR[c] = PALETTE[i % PALETTE.length]; });

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function monthLabel(week: string) {
  const d = new Date(week);
  return d.toLocaleString("default", { month: "long" }) + " " + d.getFullYear();
}
function openColor(v: number) {
  return v >= 60 ? "#16A34A" : v >= 40 ? "#D97706" : "#DC2626";
}
function classifyTheme(s: string): string {
  const sl = s.toLowerCase();
  if (/black friday|save \d+%|20% off|deal|discount/.test(sl)) return "Promo / Sale";
  if (/gift|holiday|christmas|new year/.test(sl)) return "Gift / Holiday";
  if (/summer/.test(sl)) return "Summer Escape";
  if (/fall|autumn|cozy|cabin/.test(sl)) return "Fall / Cozy";
  if (/last.?chance|limited|going fast|almost gone|don.t miss|hurry|final call|last call/.test(sl)) return "Urgency / FOMO";
  if (/review|five.star|guests.*know|obsessed/.test(sl)) return "Social Proof";
  if (/secret|shhh|only a few|only few/.test(sl)) return "Exclusivity";
  if (/spring|2026|new year|new view/.test(sl)) return "Spring / New Season";
  if (/labor day|long weekend/.test(sl)) return "Long Weekend";
  return "General";
}

function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[22px] border border-[#dbe6f3] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export default function EmailPerformanceDashboardView({ clientName }: { clientName: string }) {
  // Match sidebar client name against RAW data (case-insensitive partial match)
  const selectedClient = useMemo(() => {
    return ALL_CLIENTS.find(c => c.toLowerCase() === clientName.toLowerCase())
      ?? ALL_CLIENTS.find(c => c.toLowerCase().includes(clientName.toLowerCase()))
      ?? ALL_CLIENTS.find(c => clientName.toLowerCase().includes(c.toLowerCase()))
      ?? ALL_CLIENTS[0]
      ?? null;
  }, [clientName]);

  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [segFilter, setSegFilter] = useState<SegFilter>("all");
  const [sortField, setSortField] = useState<SortField>("week");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState<"campaigns" | "analysis">("campaigns");

  // Reset filters when client changes
  useEffect(() => {
    setActiveMonth(null);
    setSegFilter("all");
    setSortField("week");
    setSortDir("desc");
    setActiveTab("campaigns");
  }, [selectedClient]);

  const clientRows = useMemo(
    () => (!selectedClient ? [] : RAW.filter(d => d.client === selectedClient)),
    [selectedClient]
  );

  const monthTrend = useMemo(() => {
    const map: Record<string, { opens: number[]; date: Date }> = {};
    clientRows.forEach(d => {
      const m = monthLabel(d.week);
      if (!map[m]) map[m] = { opens: [], date: new Date(d.week) };
      map[m].opens.push(d.open);
    });
    return Object.entries(map)
      .map(([month, v]) => ({
        month,
        open: v.opens.reduce((a, b) => a + b, 0) / v.opens.length,
        date: v.date,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [clientRows]);

  const filteredRows = useMemo(() => {
    let rows = [...clientRows];
    if (activeMonth) rows = rows.filter(d => monthLabel(d.week) === activeMonth);
    if (segFilter === "engagers") rows = rows.filter(d => d.seg === "Recent Engagers");
    if (segFilter === "contacts") rows = rows.filter(d => d.seg === "All Contacts");
    rows.sort((a, b) => {
      const va = sortField === "week" ? new Date(a.week).getTime() : sortField === "openRate" ? a.open : a.ctr;
      const vb = sortField === "week" ? new Date(b.week).getTime() : sortField === "openRate" ? b.open : b.ctr;
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return rows;
  }, [clientRows, activeMonth, segFilter, sortField, sortDir]);

  const stats = useMemo(() => {
    if (!clientRows.length) return null;
    return {
      avgOpen: clientRows.reduce((s, d) => s + d.open, 0) / clientRows.length,
      avgCTR: clientRows.reduce((s, d) => s + d.ctr, 0) / clientRows.length,
      best: Math.max(...clientRows.map(d => d.open)),
      sends: clientRows.length,
    };
  }, [clientRows]);

  const color = selectedClient ? CLIENT_COLOR[selectedClient] : "#1a56db";

  const chartOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: {
      type: "bar" as const,
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: false },
      background: "transparent",
      events: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataPointSelection: (_e: any, _chart: any, config: any) => {
          const m = monthTrend[config.dataPointIndex]?.month;
          if (m) setActiveMonth(prev => (prev === m ? null : m));
        },
      },
    },
    dataLabels: { enabled: false },
    grid: { show: false },
    tooltip: { theme: "light", y: { formatter: (v: number) => v.toFixed(1) + "%" } },
    xaxis: {
      categories: monthTrend.map(m => m.month.split(" ")[0].slice(0, 3) + " " + String(m.date.getFullYear()).slice(2)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "10px", colors: "#94a3b8", fontWeight: "600" } },
    },
    yaxis: {
      labels: {
        style: { fontSize: "10px", colors: "#94a3b8" },
        formatter: (v: number) => v.toFixed(0) + "%",
      },
    },
    colors: monthTrend.map(m => (m.month === activeMonth ? color : color + "66")),
    plotOptions: { bar: { borderRadius: 4, columnWidth: "60%", distributed: true } },
    legend: { show: false },
  }), [monthTrend, activeMonth, color]);

  function toggleSort(f: SortField) {
    if (sortField === f) setSortDir(d => (d === "desc" ? "asc" : "desc"));
    else { setSortField(f); setSortDir("desc"); }
  }

  return (
    <div className="h-full overflow-y-auto px-16 py-8">
      <div className="mx-auto max-w-[1200px] space-y-5">

        {/* Page header */}
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,159,10,0.3)] bg-[rgba(255,159,10,0.1)] px-3 py-1 text-[11px] font-semibold text-[#d97706]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
            Sample data — connect your accounts in Settings
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2997ff]">Email Performance</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-slate-900">Campaign Analytics</h1>
          <p className="mt-0.5 text-[12px] text-slate-400">{ALL_CLIENTS.length} clients · {RAW.length} campaigns</p>
        </div>

        {/* Stats strip */}
        {stats && (
          <Surface className="p-5">
            <div className="flex flex-wrap items-center gap-5">
              {(
                [
                  { label: "Avg Open", val: stats.avgOpen.toFixed(1) + "%", c: "#16A34A" },
                  { label: "Avg CTR", val: stats.avgCTR.toFixed(2) + "%", c: "#2563EB" },
                  { label: "Best Open", val: stats.best.toFixed(1) + "%", c: color },
                  { label: "Sends", val: String(stats.sends), c: "#64748b" },
                ] as const
              ).map((s, i, arr) => (
                <div key={s.label} className="flex items-center gap-5">
                  <div className="px-1 text-center">
                    <div className="text-[18px] font-bold tabular-nums tracking-tight" style={{ color: s.c }}>{s.val}</div>
                    <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">{s.label}</div>
                  </div>
                  {i < arr.length - 1 && <div className="h-8 w-px shrink-0 bg-[#f0f4fb]" />}
                </div>
              ))}
            </div>
          </Surface>
        )}

        {/* Month trend chart */}
        <>
            {monthTrend.length >= 2 && (
              <Surface className="p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Monthly Avg Open Rate</p>
                    <div className="mt-1 h-[2px] w-8 rounded-full bg-slate-900" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setActiveMonth(null)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-all ${!activeMonth ? "border-slate-900 bg-slate-900 text-white" : "border-[#dbe6f3] text-slate-500 hover:border-slate-300"}`}
                    >All</button>
                    {monthTrend.map(m => (
                      <button
                        key={m.month}
                        onClick={() => setActiveMonth(prev => (prev === m.month ? null : m.month))}
                        className="rounded-full border px-3 py-1 text-[11px] font-medium transition-all"
                        style={activeMonth === m.month ? { borderColor: color, background: color + "18", color } : { borderColor: "#dbe6f3", color: "#64748b" }}
                      >{m.month}</button>
                    ))}
                  </div>
                </div>
                <Chart
                  type="bar"
                  height={120}
                  series={[{ name: "Avg Open %", data: monthTrend.map(m => +m.open.toFixed(1)) }]}
                  options={chartOptions}
                />
                <p className="mt-1 text-center text-[10px] text-slate-400">Click a bar or month pill to filter</p>
              </Surface>
            )}

            {/* Main content card */}
            <Surface>
              {/* Inner tab bar */}
              <div className="flex border-b border-[#f0f4fb] px-6">
                {(["campaigns", "analysis"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="mr-6 border-b-2 py-3.5 text-[13px] capitalize transition-all"
                    style={{
                      borderColor: activeTab === tab ? color : "transparent",
                      color: activeTab === tab ? "#0f172a" : "#94a3b8",
                      fontWeight: activeTab === tab ? 600 : 400,
                    }}
                  >{tab === "campaigns" ? "Campaigns" : "Analysis"}</button>
                ))}
              </div>

              {/* Campaigns panel */}
              {activeTab === "campaigns" && (
                <>
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#f9fafb] px-6 py-3">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Segment</span>
                    <div className="h-4 w-px shrink-0 bg-[#e2e8f0]" />
                    {([["all", "All"], ["engagers", "Recent Engagers"], ["contacts", "All Contacts"]] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setSegFilter(val)}
                        className="rounded-full border px-3.5 py-1 text-[11px] font-medium transition-all"
                        style={
                          segFilter === val
                            ? val === "all" ? { borderColor: "#111827", background: "#111827", color: "#fff", fontWeight: 600 }
                              : val === "engagers" ? { borderColor: "#2563EB33", background: "#EFF6FF", color: "#2563EB", fontWeight: 600 }
                              : { borderColor: "#7C3AED33", background: "#F5F3FF", color: "#7C3AED", fontWeight: 600 }
                            : { borderColor: "#e2e8f0", color: "#64748b" }
                        }
                      >{label}</button>
                    ))}
                    <div className="flex-1" />
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Sort</span>
                    {([["week", "Date"], ["openRate", "Open %"], ["ctr", "CTR %"]] as const).map(([field, label]) => (
                      <button
                        key={field}
                        onClick={() => toggleSort(field)}
                        className={`flex items-center gap-1 rounded-[8px] border px-3 py-1.5 text-[11px] transition-all ${sortField === field ? "border-[#2563EB] bg-[#EFF6FF] font-semibold text-[#2563EB]" : "border-[#e2e8f0] text-slate-500 hover:border-slate-300"}`}
                      >
                        {label} <span>{sortField === field ? (sortDir === "desc" ? "↓" : "↑") : "↕"}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid border-b-[1.5px] border-slate-900 px-6 py-2" style={{ gridTemplateColumns: "1fr 110px 90px 80px 80px" }}>
                    {["Subject Line", "Week", "Segment", "Open %", "CTR %"].map(h => (
                      <span key={h} className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{h}</span>
                    ))}
                  </div>

                  <div className="max-h-[480px] overflow-y-auto">
                    {filteredRows.length === 0 ? (
                      <div className="py-10 text-center text-[13px] text-slate-400">No campaigns match these filters</div>
                    ) : filteredRows.map((d, i) => {
                      const oc = openColor(d.open);
                      const theme = classifyTheme(d.subj);
                      return (
                        <div key={i} className="grid items-start border-b border-[#f9fafb] px-6 py-3 transition-colors hover:bg-slate-50" style={{ gridTemplateColumns: "1fr 110px 90px 80px 80px" }}>
                          <div>
                            <div className="text-[13px] font-medium leading-[1.4] text-slate-900">{d.subj}</div>
                            <span className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: oc + "12", color: oc }}>{theme}</span>
                          </div>
                          <div className="pt-0.5 text-[12px] tabular-nums text-slate-500">{d.week}</div>
                          <div className="pt-0.5">
                            <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${d.seg === "Recent Engagers" ? "bg-[#EFF6FF] text-[#2563EB]" : "bg-[#F5F3FF] text-[#7C3AED]"}`}>
                              {d.seg === "Recent Engagers" ? "Engagers" : "All"}
                            </span>
                          </div>
                          <div>
                            <div className="text-[13px] font-bold tabular-nums" style={{ color: oc }}>{d.open.toFixed(1)}%</div>
                            <div className="mt-1 h-[3px] w-12 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(d.open, 100)}%`, background: oc }} />
                            </div>
                          </div>
                          <div className="pt-0.5 text-[13px] font-semibold tabular-nums text-[#2563EB]">{d.ctr.toFixed(2)}%</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#f0f4fb] px-6 py-2.5 text-right text-[11px] text-slate-400">
                    Showing {filteredRows.length} campaign{filteredRows.length !== 1 ? "s" : ""}
                    {activeMonth && ` · ${activeMonth}`}
                    {segFilter !== "all" && ` · ${segFilter === "engagers" ? "Recent Engagers" : "All Contacts"}`}
                  </div>
                </>
              )}

              {/* Analysis panel */}
              {activeTab === "analysis" && (
                <>
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#f9fafb] px-6 py-3">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Filter Month</span>
                    <div className="h-4 w-px shrink-0 bg-[#e2e8f0]" />
                    <button
                      onClick={() => setActiveMonth(null)}
                      className={`rounded-full border px-3.5 py-1 text-[11px] font-medium transition-all ${!activeMonth ? "border-slate-900 bg-slate-900 font-semibold text-white" : "border-[#e2e8f0] text-slate-500 hover:border-slate-300"}`}
                    >All</button>
                    {monthTrend.map(m => (
                      <button
                        key={m.month}
                        onClick={() => setActiveMonth(prev => (prev === m.month ? null : m.month))}
                        className="rounded-full border px-3.5 py-1 text-[11px] font-medium transition-all"
                        style={activeMonth === m.month ? { borderColor: color, background: color + "18", color } : { borderColor: "#e2e8f0", color: "#64748b" }}
                      >{m.month}</button>
                    ))}
                  </div>
                  <AnalysisContent rows={filteredRows} color={color} />
                </>
              )}
            </Surface>
        </>
      </div>
    </div>
  );
}

function AnalysisContent({ rows, color }: { rows: Row[]; color: string }) {
  if (!rows.length) {
    return <div className="py-10 text-center text-[13px] text-slate-400">No data for this selection</div>;
  }

  const reRows = rows.filter(d => d.seg === "Recent Engagers");
  const acRows = rows.filter(d => d.seg === "All Contacts");
  const reAvg = reRows.length ? reRows.reduce((s, d) => s + d.open, 0) / reRows.length : null;
  const acAvg = acRows.length ? acRows.reduce((s, d) => s + d.open, 0) / acRows.length : null;
  const reCTR = reRows.length ? reRows.reduce((s, d) => s + d.ctr, 0) / reRows.length : null;
  const acCTR = acRows.length ? acRows.reduce((s, d) => s + d.ctr, 0) / acRows.length : null;

  const themeMap: Record<string, { opens: number[]; ctrs: number[]; count: number }> = {};
  rows.forEach(d => {
    const t = classifyTheme(d.subj);
    if (!themeMap[t]) themeMap[t] = { opens: [], ctrs: [], count: 0 };
    themeMap[t].opens.push(d.open);
    themeMap[t].ctrs.push(d.ctr);
    themeMap[t].count++;
  });
  const themes = Object.entries(themeMap)
    .map(([theme, v]) => ({
      theme,
      avgOpen: v.opens.reduce((a, b) => a + b, 0) / v.opens.length,
      avgCTR: v.ctrs.reduce((a, b) => a + b, 0) / v.ctrs.length,
      count: v.count,
    }))
    .sort((a, b) => b.avgOpen - a.avgOpen);

  const bestRows = [...rows].sort((a, b) => b.open - a.open).slice(0, 10);

  return (
    <div className="space-y-6 px-6 py-5">
      {(reAvg !== null || acAvg !== null) && (
        <div>
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Segment Comparison</p>
          <div className="grid grid-cols-2 gap-3">
            {reAvg !== null && (
              <div className="rounded-[14px] border border-[#2563EB]/10 bg-[#2563EB]/[0.03] p-4">
                <div className="text-[22px] font-bold tabular-nums tracking-tight text-[#2563EB]">{reAvg.toFixed(1)}%</div>
                <div className="mt-0.5 text-[12px] font-semibold text-slate-700">Recent Engagers</div>
                <div className="text-[11px] text-slate-400">{reRows.length} sends · {reCTR!.toFixed(2)}% CTR</div>
              </div>
            )}
            {acAvg !== null && (
              <div className="rounded-[14px] border border-[#7C3AED]/10 bg-[#7C3AED]/[0.03] p-4">
                <div className="text-[22px] font-bold tabular-nums tracking-tight text-[#7C3AED]">{acAvg.toFixed(1)}%</div>
                <div className="mt-0.5 text-[12px] font-semibold text-slate-700">All Contacts</div>
                <div className="text-[11px] text-slate-400">{acRows.length} sends · {acCTR!.toFixed(2)}% CTR</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Theme Performance</p>
        <div className="space-y-2">
          {themes.map((t, i) => (
            <div key={t.theme} className={`flex items-center gap-3 rounded-[10px] border p-3 ${i === 0 ? "border-slate-900 bg-slate-900" : "border-[#f0f4fb] bg-[#f9fafb]"}`}>
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-[10px] font-bold ${i === 0 ? "bg-white/15 text-white" : "bg-[#e2e8f0] text-slate-400"}`}>{i + 1}</div>
              <div className="flex-1">
                <div className={`text-[12px] font-semibold ${i === 0 ? "text-white" : "text-slate-900"}`}>{t.theme}</div>
                <div className={`text-[10px] ${i === 0 ? "text-white/50" : "text-slate-400"}`}>{t.count} sends</div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold tabular-nums" style={{ color: i === 0 ? "#fff" : color }}>{t.avgOpen.toFixed(1)}%</div>
                <div className={`text-[10px] ${i === 0 ? "text-white/40" : "text-slate-400"}`}>CTR {t.avgCTR.toFixed(2)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Best Subject Lines</p>
        <div className="space-y-1.5">
          {bestRows.map((d, i) => {
            const oc = openColor(d.open);
            return (
              <div key={i} className="flex items-start gap-3 rounded-[10px] border border-[#f0f4fb] bg-[#f9fafb] px-4 py-3">
                <div className="min-w-[18px] pt-0.5 text-[11px] font-bold text-slate-300">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium leading-[1.4] text-slate-900">{d.subj}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: oc + "12", color: oc }}>{classifyTheme(d.subj)}</span>
                    <span className="text-[10px] text-slate-400">{d.week}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[13px] font-bold tabular-nums" style={{ color: oc }}>{d.open.toFixed(1)}%</div>
                  <div className="text-[10px] tabular-nums text-[#2563EB]">{d.ctr.toFixed(2)}% CTR</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
