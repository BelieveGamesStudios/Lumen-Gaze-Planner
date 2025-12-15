"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarDays, Target, Repeat, BarChart3, Sparkles, ArrowRight } from "lucide-react"

export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-fade-in-up")
          entry.target.classList.remove("opacity-0")
        }
      })
    }, observerOptions)

    const heroElements = heroRef.current?.querySelectorAll(".animate-on-scroll")
    const featureElements = featuresRef.current?.querySelectorAll(".animate-on-scroll")

    heroElements?.forEach((el) => observer.observe(el))
    featureElements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 gradient-mesh opacity-30 pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(oklch(0.5 0.2 255) 1px, transparent 1px),
                           linear-gradient(90deg, oklch(0.5 0.2 255) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Header */}
      <header className="relative border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <CalendarDays className="h-7 w-7 text-accent transition-transform group-hover:scale-110 group-hover:rotate-6" />
              <div className="absolute inset-0 blur-xl bg-accent/30 animate-glow" />
            </div>
            <span className="font-bold text-xl tracking-tight">Lumen Gaze Planner</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="font-medium">Login</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="font-semibold shadow-lg shadow-primary/20">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative container mx-auto px-4 pt-24 pb-32 text-center">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Badge */}
          <div className="animate-on-scroll opacity-0 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 text-sm font-medium backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-accent animate-glow" />
              <span>Plan smarter, achieve more</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="animate-on-scroll opacity-0 stagger-1 text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter">
            Plan Your Year,
            <br />
            <span className="gradient-text">Week by Week</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-on-scroll opacity-0 stagger-2 text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
            A comprehensive 52-week planner designed for ambitious achievers.
            Set goals, track progress, and visualize your journey to success.
          </p>

          {/* CTA Buttons */}
          <div className="animate-on-scroll opacity-0 stagger-3 flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="btn-premium gap-2 h-14 px-8 text-lg font-bold shadow-2xl shadow-primary/30"
              >
                <Sparkles className="h-5 w-5" />
                Start Planning Free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg font-semibold glass border-2 hover:scale-105 transition-all"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Social Proof or Stats */}
          <div className="animate-on-scroll opacity-0 stagger-4 pt-12 flex flex-wrap items-center justify-center gap-12 text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl font-bold gradient-text">52</div>
              <div className="font-medium">Weeks Planned</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl font-bold gradient-text">∞</div>
              <div className="font-medium">Goals Achieved</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl font-bold gradient-text">100%</div>
              <div className="font-medium">Productivity</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="relative container mx-auto px-4 pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Everything you need to
              <br />
              <span className="gradient-text">succeed this year</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to keep you organized, focused, and motivated throughout your journey.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            <FeatureCard
              icon={<CalendarDays className="h-10 w-10 animate-float" />}
              title="52 Week Layout"
              description="Beautifully designed weekly views with intelligent task management. Completed items automatically sort and organize themselves, keeping your focus on what matters."
              delay="stagger-1"
            />
            <FeatureCard
              icon={<Target className="h-10 w-10 animate-float" style={{ animationDelay: "0.5s" }} />}
              title="Yearly Goals"
              description="Define 5-10 ambitious goals and connect tasks directly to them. Watch your progress unfold as you systematically work toward your biggest aspirations."
              delay="stagger-2"
            />
            <FeatureCard
              icon={<Repeat className="h-10 w-10 animate-float" style={{ animationDelay: "1s" }} />}
              title="Recurring Tasks"
              description="Set it once, achieve it always. Daily, weekly, biweekly, or monthly tasks automatically populate across your entire year, building lasting habits."
              delay="stagger-3"
            />
            <FeatureCard
              icon={<BarChart3 className="h-10 w-10 animate-float" style={{ animationDelay: "1.5s" }} />}
              title="Progress Heatmap"
              description="GitHub-inspired visualization brings your productivity to life. See your completion intensity across the year and stay motivated with visual momentum."
              delay="stagger-4"
            />
          </div>
        </div>
      </section>

      {/* Footer CTA Section */}
      <section className="relative py-24 border-t border-border/50">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Ready to make this your
              <br />
              <span className="gradient-text">best year yet?</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of high achievers planning their success, week by week.
            </p>
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="btn-premium gap-2 h-14 px-10 text-lg font-bold shadow-2xl shadow-primary/30"
              >
                <Sparkles className="h-5 w-5" />
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/50 py-8 backdrop-blur-xl bg-background/80">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground font-medium">
            Built for productivity enthusiasts who think in weeks, not days.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay?: string
}) {
  return (
    <div
      className={`animate-on-scroll opacity-0 ${delay || ''} feature-card group p-8 rounded-2xl glass border border-border/50 hover:border-accent/50 backdrop-blur-sm`}
    >
      <div className="relative mb-6">
        <div className="text-accent relative z-10">{icon}</div>
        <div className="absolute inset-0 blur-2xl bg-accent/20 group-hover:bg-accent/30 transition-all" />
      </div>
      <h3 className="font-bold text-xl mb-3 tracking-tight">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
