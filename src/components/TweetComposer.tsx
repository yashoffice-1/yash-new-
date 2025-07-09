import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";

interface TweetComposerProps {
  onTweetSuccess?: () => void;
}

export function TweetComposer({ onTweetSuccess }: TweetComposerProps) {
  const { toast } = useToast();
  const [tweetText, setTweetText] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handlePostTweet = async () => {
    if (!tweetText.trim()) {
      toast({
        title: "Tweet Required",
        description: "Please enter some text for your tweet.",
        variant: "destructive",
      });
      return;
    }

    if (tweetText.length > 280) {
      toast({
        title: "Tweet Too Long",
        description: "Tweets must be 280 characters or less.",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Please log in to post tweets');
      }

      const { data, error } = await supabase.functions.invoke('twitter-post', {
        body: { 
          text: tweetText,
          userId: user.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Tweet Posted Successfully!",
        description: `Your tweet has been posted to Twitter.`,
      });

      setTweetText("");
      onTweetSuccess?.();
    } catch (error: any) {
      console.error('Tweet posting error:', error);
      toast({
        title: "Failed to Post Tweet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const remainingChars = 280 - tweetText.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="h-5 w-5" />
          <span>Compose Tweet</span>
        </CardTitle>
        <CardDescription>
          Share your thoughts with your Twitter followers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="What's happening?"
            value={tweetText}
            onChange={(e) => setTweetText(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={280}
          />
          <div className="flex justify-between items-center">
            <span className={`text-sm ${remainingChars < 0 ? 'text-red-500' : remainingChars < 20 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
              {remainingChars} characters remaining
            </span>
            <Button
              onClick={handlePostTweet}
              disabled={isPosting || !tweetText.trim() || remainingChars < 0}
              className="flex items-center space-x-2"
            >
              {isPosting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isPosting ? "Posting..." : "Post Tweet"}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}