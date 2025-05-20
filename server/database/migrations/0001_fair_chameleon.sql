CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`fileName` text NOT NULL,
	`r2Key` text NOT NULL,
	`contentType` text NOT NULL,
	`fileSize` integer NOT NULL,
	`parsedContent` text,
	`title` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resumes_r2Key_unique` ON `resumes` (`r2Key`);--> statement-breakpoint
CREATE INDEX `resume_userId_idx` ON `resumes` (`userId`);