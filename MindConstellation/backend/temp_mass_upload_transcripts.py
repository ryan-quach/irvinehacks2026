from submit_entry import submit_journal_entry

transcripts = [
    # 1
    "Today was honestly one of the best days I've had in a while. Work went smoothly, I finished a big project ahead of deadline, and my boss actually noticed. Went for a run after and hit a new personal best on my 5K. Feeling really good about where things are headed.",

    # 2
    "I couldn't sleep last night. Kept tossing and turning thinking about bills. Rent is due next week and I'm still short. I picked up an extra shift but it barely covers groceries. I hate feeling this stressed about money all the time. It's exhausting.",

    # 3
    "Had a great workout this morning. Bench pressed 185 for the first time which felt amazing. My gym buddy said my form has improved a lot. Thinking about signing up for that powerlifting meet in April. Nutrition has been on point too, meal prepping really makes a difference.",

    # 4
    "Got into a fight with my mom again. She keeps bringing up how I should move closer to home and it drives me crazy. I love her but she doesn't understand that I need my own space. Called my sister after and she helped me calm down. Family stuff is so complicated.",

    # 5
    "Therapy session today was intense. We talked about my anxiety around social situations and where it stems from. My therapist suggested I start journaling more which is why I'm doing this. It's weird talking to myself but I guess it helps to get thoughts out.",

    # 6
    "Started learning guitar last week and I'm already hooked. My fingers hurt like crazy but I can almost play a full chord progression now. Watching YouTube tutorials every night. It feels good to have something creative that's just for me and not tied to work or school.",

    # 7
    "Midterms are destroying me. I have three exams this week and I've barely studied for two of them. Spent all day in the library but I couldn't focus. My ADHD medication feels like it's not working anymore. I need to talk to my doctor about adjusting the dose.",

    # 8
    "My girlfriend surprised me with dinner tonight. She cooked my favorite meal and we just talked for hours. We've been together two years now and honestly it keeps getting better. She mentioned wanting to travel this summer and I'm really excited about planning that.",

    # 9
    "Rough day. Got passed over for the promotion I've been working toward for six months. My manager said I need more leadership experience which feels like a cop out. Honestly considering updating my resume and seeing what else is out there. I deserve better than this.",

    # 10
    "Went hiking with friends today at Crystal Cove. The weather was perfect and we found this secluded beach spot. Haven't laughed that hard in months. I need to make more time for stuff like this instead of just grinding all week. Life's too short.",

    # 11
    "I've been meditating every morning for two weeks now and I actually notice a difference. My mind feels clearer and I'm not as reactive when things go wrong. Started with five minutes and now I'm up to fifteen. Small habits really do compound over time.",

    # 12
    "My roommate moved out and I can't afford this apartment alone. Been looking at places but everything is so expensive. Might have to move further from campus which would mess up my commute. Money stress is the worst kind of stress honestly.",

    # 13
    "Played basketball at the rec center after class. Haven't played in forever and I was terrible but it was so fun. Met some cool people too. Thinking about joining the intramural league next quarter. I miss being part of a team.",

    # 14
    "Had a panic attack at the grocery store today. Came out of nowhere. I had to leave my cart and sit in my car for twenty minutes. I thought I was past this but apparently not. Going to bring it up in therapy next week. It's frustrating.",

    # 15
    "Finally paid off my credit card. It took eight months of strict budgeting but it's done. Feels like a weight lifted off my shoulders. Now I can start building my emergency fund. Financial freedom is the goal and I'm getting closer one step at a time.",

    # 16
    "My dad called today which is rare. He asked about school and actually seemed interested for once. We talked for almost an hour. I don't know if things are changing between us but it felt nice. I've been holding onto a lot of resentment and maybe it's time to let some of it go.",

    # 17
    "Bombed my chemistry exam. I studied for days but the questions were nothing like the practice tests. Feeling defeated. My GPA can't take many more hits like this. Thinking about getting a tutor because clearly studying on my own isn't cutting it.",

    # 18
    "Ran my first half marathon today. Thirteen point one miles. I almost quit at mile ten but pushed through. Crossing that finish line was the most accomplished I've felt in years. All those early morning training runs were worth it. Already looking at the next race.",

    # 19
    "I feel lonely. Like genuinely lonely. I have friends but nobody I feel like I can really talk to about deep stuff. Everyone's busy with their own lives. I miss having a close friend group like I did in high school. Making friends as an adult is hard.",

    # 20
    "Work meeting today was a disaster. I presented my proposal and the whole team shot it down. My manager didn't even back me up. I spent weeks on that project. Starting to wonder if I'm even in the right field. Maybe I should explore something more creative.",

    # 21
    "Cooked a new recipe tonight. Thai basil chicken from scratch. It actually turned out amazing. Cooking has become my way of decompressing after long days. There's something meditative about chopping vegetables and following a recipe. Want to try making pasta from scratch next.",

    # 22
    "Slept twelve hours last night and still woke up exhausted. I think it might be depression creeping back in. Everything feels heavy and I have zero motivation. I know I should exercise or call someone but I just want to stay in bed. Tomorrow will be better hopefully.",

    # 23
    "Had coffee with an old college friend today. We hadn't seen each other in two years but picked up right where we left off. She's doing amazing things with her startup. It was inspiring but also made me feel like I'm behind. Comparison really is the thief of joy.",

    # 24
    "My little brother got accepted to UCI and I'm so proud. He called me screaming and I almost cried. I remember how nervous I was during admissions. Can't wait to show him around campus and introduce him to all the good food spots. Family wins feel the best.",

    # 25
    "Started a new job this week and the imposter syndrome is real. Everyone seems so competent and I'm still figuring out where the bathroom is. My manager has been nice though and assigned me a mentor. I just need to give myself grace. It's only week one.",

    # 26
    "Yoga class this evening was exactly what I needed. We did a lot of hip openers which is where I hold all my stress apparently. Left feeling like a completely different person. I need to commit to going at least twice a week. My body and mind both need it.",

    # 27
    "Got my blood work results back and my cholesterol is high. I'm only twenty four. Doctor said I need to change my diet and exercise more. It's a wake up call for sure. No more late night fast food runs. Time to take my health seriously.",

    # 28
    "My best friend is moving to New York next month and I'm trying to be happy for her but honestly I'm devastated. She's been my rock through everything. We promised to FaceTime every week but I know it won't be the same. Change is hard.",

    # 29
    "Finished reading Atomic Habits and it's genuinely changing how I think about my daily routines. Started habit stacking my morning. Wake up, meditate, journal, workout. It's only been a week but I already feel more in control. Knowledge without action is useless though so I need to stay consistent.",

    # 30
    "My ex texted me today. It's been six months since we broke up and I thought I was over it. Seeing their name pop up brought everything back. I didn't respond. I know that's the right move but it still hurts. Healing isn't linear I guess.",

    # 31
    "Had an amazing brainstorming session at work today. The whole team was vibing and we came up with a really innovative solution for the client. Days like this remind me why I chose this career. When the work is good it's really good. Left the office feeling energized.",

    # 32
    "Couldn't get out of bed for my eight AM class again. That's the third time this month. I know attendance matters but my sleep schedule is completely wrecked. I stay up until three AM every night scrolling my phone. I need to set boundaries with screen time.",

    # 33
    "Went to my nephew's soccer game today. Watching him score his first goal and run to me cheering was the purest moment. Family days like this ground me and remind me what actually matters. All the work stress fades away when I'm with the people I love.",

    # 34
    "I've been stress eating like crazy this week. Every night I find myself mindlessly snacking at midnight. I know it's emotional and not physical hunger. Work has been overwhelming and food is my comfort. Need to find healthier coping mechanisms. Maybe I'll try that boxing class.",

    # 35
    "Finally had the courage to set boundaries with my toxic coworker today. Told them I won't be covering their shifts anymore. My heart was racing but I did it. My therapist would be proud. Standing up for myself is something I'm actively working on and today was a win.",

    # 36
    "Spent the whole day painting. Lost complete track of time which hasn't happened in months. I used to be so creative as a kid and somewhere along the way I lost that. Picking up art again feels like reconnecting with a part of myself I forgot existed.",

    # 37
    "My car broke down on the freeway today. Had to wait two hours for a tow truck in the heat. The repair estimate is eight hundred dollars which I absolutely do not have right now. My dad offered to help but I hate asking for money. Pride is expensive.",

    # 38
    "Group study session went well tonight. Finally understanding organic chemistry thanks to my study group. Sarah explained reaction mechanisms in a way that actually clicked. Feeling cautiously optimistic about the final. Collaboration really does make a difference. Can't do everything alone.",

    # 39
    "Went on a first date tonight and it was surprisingly great. We talked for three hours and closed down the restaurant. She's funny and smart and we have a lot in common. Trying not to get too excited too fast but I haven't felt this way in a while.",

    # 40
    "My anxiety has been through the roof this week. Heart racing, sweaty palms, the whole thing. I think it's the job interviews coming up. I want this opportunity so badly and the fear of rejection is paralyzing. Deep breaths. I've prepared. I'll be okay.",

    # 41
    "Hit a new deadlift PR today. Three fifteen. Been chasing this number for months. The guys at the gym were hyping me up which helped. Progressive overload really works when you trust the process. Next goal is three plates. Consistency over everything.",

    # 42
    "My grandma is in the hospital again. Mom called crying and I felt so helpless being hours away. I'm driving home this weekend no matter what. She's the strongest woman I know and I need to see her. Some things are more important than work or school.",

    # 43
    "Budgeted my whole month out today using that spreadsheet template. It's scary seeing the numbers but at least I know where I stand. Cutting out subscriptions I don't use saved me almost sixty dollars. Every little bit counts when you're living paycheck to paycheck.",

    # 44
    "Volunteered at the food bank this morning with some classmates. Served over two hundred families. Really puts my problems in perspective. I complain about being busy but I have food on my table and a roof over my head. Gratitude is a practice and I need more of it.",

    # 45
    "Pulled an all nighter for my programming assignment and still didn't finish. I'm running on caffeine and regret. My professor doesn't accept late work so I submitted what I had. This quarter has been brutal. I need to manage my time better. I keep saying that though.",

    # 46
    "Had the most wholesome FaceTime with my long distance friend today. She showed me her new apartment and her cat. Even through a screen I felt so connected. Good friendships transcend distance. I need to be better about reaching out to people I care about.",

    # 47
    "I've been waking up at five thirty AM for a month now and it's changed my life. The quiet morning hours before the world wakes up are sacred. I get my best thinking done then. It was brutal at first but now my body just does it. Discipline creates freedom.",

    # 48
    "My therapist suggested I might have ADHD and recommended I get tested. A lot of things suddenly make sense. The procrastination, the inability to focus, losing things constantly. Part of me feels relieved and part of me feels overwhelmed. Either way I want answers.",

    # 49
    "Celebrated my one year anniversary at my job today. My team got me a card and cake which was sweet. Reflecting on how much I've grown professionally this year. I went from not knowing anything to leading small projects. Growth happens when you're not paying attention.",

    # 50
    "Tried a cold plunge for the first time today. It was absolutely awful for the first thirty seconds then something shifted. Got out feeling like a superhero. The mental toughness aspect is what interests me most. If I can sit in ice water I can handle a hard conversation.",

    # 51
    "My sister had her baby today. I'm officially an uncle. Held this tiny human in my arms and everything else disappeared. She has my sister's eyes. I'm already planning how I'm going to spoil this kid. Life is beautiful sometimes.",

    # 52
    "Failed my driving test for the second time. Parallel parking got me again. I'm embarrassed. All my friends have their licenses and I'm still taking the bus. Scheduling another attempt next month. I refuse to let this define me even though it feels defeating right now.",

    # 53
    "Spent the evening reorganizing my room and it felt like therapy. Threw out bags of stuff I've been hoarding for no reason. Clean space clean mind is real. Lit a candle and just enjoyed the calm. Sometimes the most productive thing you can do is simplify.",

    # 54
    "Got a raise today. Not huge but enough to notice. My manager said my work ethic hasn't gone unnoticed. It feels validating after months of grinding without recognition. Treated myself to a nice dinner. You have to celebrate the wins no matter how small.",

    # 55
    "My friend group is falling apart and I don't know how to fix it. Two of them aren't speaking and everyone's picking sides. I refuse to get involved in the drama but it means I'm kind of alone right now. Miss when things were simple between us all.",

    # 56
    "Signed up for a half marathon training program. Twelve weeks starting Monday. I've never been a runner but something in me wants to prove I can do hard things. Bought new shoes and downloaded a training app. Nervous but excited. Here goes nothing.",

    # 57
    "Had a really honest conversation with my partner about where we see this going. We're on the same page about the big stuff which is reassuring. Talked about moving in together eventually. It's scary but exciting. Communication really is the foundation of everything.",

    # 58
    "Woke up feeling grateful today for no specific reason. The sun was out, I had good coffee, and my playlist hit different on the drive to work. Not every day needs to be productive or meaningful. Sometimes a peaceful ordinary day is more than enough.",

    # 59
    "I've been avoiding the doctor for months because I'm scared of what they might find. Health anxiety is real. Finally made an appointment for next Tuesday. Whatever it is I'd rather know than keep worrying. Being proactive about health is a form of self love even when it's terrifying."
]

for i, transcript in enumerate(transcripts):
    try:
        entry_id = submit_journal_entry(transcript)
        print(f"[{i+1}/59] ✅ {entry_id}")
    except Exception as e:
        print(f"[{i+1}/59] ❌ {e}")