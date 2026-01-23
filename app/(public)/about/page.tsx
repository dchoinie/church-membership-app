import { Metadata } from "next";
import { Church, Heart, Users, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Simple Church Tools",
  description: "Learn about Simple Church Tools and our mission to serve small churches with modern, efficient management solutions.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-primary/10">
              <Church className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">About Simple Church Tools</h1>
          <p className="text-xl text-muted-foreground">
            Empowering small churches with modern, efficient management solutions
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section className="bg-card rounded-lg p-8 border border-border">
            <div className="flex items-start gap-4 mb-4">
              <Heart className="h-6 w-6 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
                <p className="text-base leading-relaxed mb-4">
                  Simple Church Tools was born from a deep understanding of the unique challenges 
                  facing small churches and their dedicated staff. As a faithful member of the 
                  Lutheran Church—Missouri Synod (LCMS), our founder recognized a critical need 
                  in the church community: small congregations and their administrative teams 
                  were struggling with outdated, inefficient tools that made essential tasks 
                  unnecessarily complicated and time-consuming.
                </p>
                <p className="text-base leading-relaxed mb-4">
                  Many small churches operate with limited resources and volunteer staff who 
                  generously give their time to serve their congregations. Yet, they were 
                  forced to rely on spreadsheets, paper records, or expensive enterprise 
                  solutions that were overcomplicated for their needs. This reality inspired 
                  the creation of Simple Church Tools—a platform designed specifically with 
                  small churches in mind.
                </p>
                <p className="text-base leading-relaxed">
                  Our mission is to provide churches with modern, intuitive, and affordable 
                  tools that streamline essential administrative tasks, allowing church staff 
                  and volunteers to focus on what truly matters: serving their congregations 
                  and spreading the Gospel.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-card rounded-lg p-8 border border-border">
            <div className="flex items-start gap-4 mb-4">
              <Target className="h-6 w-6 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
                <p className="text-base leading-relaxed mb-4">
                  We believe that every church, regardless of size, deserves access to 
                  professional-grade management tools that are both powerful and easy to use. 
                  Our mission is to:
                </p>
                <ul className="list-disc pl-6 space-y-3 text-base leading-relaxed">
                  <li>
                    <strong>Simplify church administration</strong> by providing intuitive 
                    tools for managing members, households, attendance, giving, and more
                  </li>
                  <li>
                    <strong>Save time and resources</strong> so church staff and volunteers 
                    can dedicate more energy to ministry and community outreach
                  </li>
                  <li>
                    <strong>Ensure data security and privacy</strong> with enterprise-grade 
                    security measures that protect sensitive church and member information
                  </li>
                  <li>
                    <strong>Support small churches</strong> with affordable pricing that 
                    respects their limited budgets
                  </li>
                  <li>
                    <strong>Provide excellent support</strong> because we understand that 
                    churches need reliable partners, not just software vendors
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-card rounded-lg p-8 border border-border">
            <div className="flex items-start gap-4 mb-4">
              <Users className="h-6 w-6 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold mb-4">Built for Small Churches</h2>
                <p className="text-base leading-relaxed mb-4">
                  Unlike enterprise solutions designed for large organizations, Simple Church 
                  Tools is purpose-built for the unique needs of small churches. We understand 
                  that small congregations have different priorities, workflows, and constraints 
                  than larger institutions.
                </p>
                <p className="text-base leading-relaxed mb-4">
                  Our platform offers essential features without overwhelming complexity:
                </p>
                <ul className="list-disc pl-6 space-y-3 text-base leading-relaxed mb-4">
                  <li>Member and household management</li>
                  <li>Service attendance tracking</li>
                  <li>Giving and donation management</li>
                  <li>Administrative user management</li>
                  <li>Reports and analytics</li>
                  <li>Secure, cloud-based access from anywhere</li>
                </ul>
                <p className="text-base leading-relaxed">
                  Every feature is designed with simplicity and efficiency in mind, ensuring 
                  that even volunteers with limited technical experience can use the platform 
                  effectively. We believe that great tools should empower, not intimidate.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
